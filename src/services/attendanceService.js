import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getTodayDateString, formatTimeString, calculateMinutes, formatHoursMinutes } from '../utils/timeUtils';
import { getStaffByCode, getAllStaff } from './staffService';
import { createAuditLog } from './auditService';

/**
 * Process a barcode scan on the ATTENDANCE SCANNER page using 100% pure Firestore
 */
export async function processAttendanceScan(staffCode, operatorEmail = 'scanner-station') {
  if (!staffCode) {
    throw new Error('No barcode scanned');
  }

  // 1. Find staff member in Firestore
  const staff = await getStaffByCode(staffCode);
  if (!staff) {
    throw new Error('Staff ID not recognized. Invalid or unknown barcode.');
  }

  if (staff.employmentStatus && staff.employmentStatus !== 'active') {
    throw new Error(`Staff member ${staff.firstName} ${staff.lastName} is marked as ${staff.employmentStatus.toUpperCase()}. Attendance restricted.`);
  }

  const todayDate = getTodayDateString();
  const now = new Date();
  const nowIso = now.toISOString();
  const timeFormatted = formatTimeString(now);

  // 2. Fetch today's attendance record and sessions for this staff from Firestore
  const dailyDocId = `${staff.id}_${todayDate}`;
  const dailyRef = doc(db, 'attendance', dailyDocId);
  const dailySnap = await getDoc(dailyRef);
  let dailyRecord = dailySnap.exists() ? dailySnap.data() : null;

  const sessionsQuery = query(
    collection(db, 'attendanceSessions'),
    where('staffId', '==', staff.id),
    where('date', '==', todayDate)
  );
  const sessionsSnap = await getDocs(sessionsQuery);
  const sessionsList = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const activeSession = sessionsList.find(s => s.status === 'open');

  let scanType = 'IN';
  let currentSessionDuration = '0h 00m';
  let updatedTotalMinutes = 0;

  if (!dailyRecord) {
    // 1st scan of the day -> CLOCK IN
    scanType = 'IN';
    const newSessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newSession = {
      id: newSessionId,
      staffId: staff.id,
      staffCode: staff.staffCode,
      date: todayDate,
      clockIn: nowIso,
      clockOut: null,
      durationMinutes: 0,
      status: 'open',
      corrected: false
    };

    dailyRecord = {
      id: dailyDocId,
      staffId: staff.id,
      staffCode: staff.staffCode,
      staffName: `${staff.firstName} ${staff.lastName}`,
      staffPhoto: staff.photoUrl,
      department: staff.department,
      branch: staff.branch,
      date: todayDate,
      firstArrival: nowIso,
      lastScan: nowIso,
      currentStatus: 'working',
      totalMinutesToday: 0,
      sessionsCount: 1,
      hasOpenSession: true,
      updatedAt: nowIso
    };

    await setDoc(doc(db, 'attendanceSessions', newSessionId), newSession);
    await setDoc(dailyRef, dailyRecord);

  } else if (activeSession) {
    // Open session exists -> CLOCK OUT
    scanType = 'OUT';
    const sessionMins = calculateMinutes(activeSession.clockIn, nowIso);
    
    const updatedActiveSession = {
      ...activeSession,
      clockOut: nowIso,
      durationMinutes: sessionMins,
      status: 'closed'
    };

    currentSessionDuration = formatHoursMinutes(sessionMins);

    const closedMins = sessionsList
      .filter(s => s.id !== activeSession.id && s.status === 'closed')
      .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

    updatedTotalMinutes = closedMins + sessionMins;

    dailyRecord = {
      ...dailyRecord,
      lastScan: nowIso,
      currentStatus: 'outside',
      totalMinutesToday: updatedTotalMinutes,
      hasOpenSession: false,
      updatedAt: nowIso
    };

    await setDoc(doc(db, 'attendanceSessions', activeSession.id), updatedActiveSession);
    await setDoc(dailyRef, dailyRecord);

  } else {
    // No open session exists -> Next scan -> CLOCK IN
    scanType = 'IN';
    const newSessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newSession = {
      id: newSessionId,
      staffId: staff.id,
      staffCode: staff.staffCode,
      date: todayDate,
      clockIn: nowIso,
      clockOut: null,
      durationMinutes: 0,
      status: 'open',
      corrected: false
    };

    const closedMins = sessionsList
      .filter(s => s.status === 'closed')
      .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

    updatedTotalMinutes = closedMins;

    dailyRecord = {
      ...dailyRecord,
      lastScan: nowIso,
      currentStatus: 'working',
      sessionsCount: (dailyRecord.sessionsCount || 0) + 1,
      hasOpenSession: true,
      updatedAt: nowIso
    };

    await setDoc(doc(db, 'attendanceSessions', newSessionId), newSession);
    await setDoc(dailyRef, dailyRecord);
  }

  return {
    success: true,
    type: scanType,
    staff,
    timestamp: timeFormatted,
    fullTimestamp: nowIso,
    sessionDuration: currentSessionDuration,
    totalHoursToday: formatHoursMinutes(updatedTotalMinutes),
    totalMinutesToday: updatedTotalMinutes,
    sessionCount: dailyRecord.sessionsCount
  };
}

/**
 * Gets attendance records for today directly from Firestore
 */
export async function getTodayAttendance(targetDate = getTodayDateString()) {
  const rawStaff = await getAllStaff();
  const allStaff = Array.isArray(rawStaff) ? rawStaff : [];

  let attendanceList = [];
  try {
    const qAtt = query(collection(db, 'attendance'), where('date', '==', targetDate));
    const attSnap = await getDocs(qAtt);
    attendanceList = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Error getting attendance records:", err.message);
  }

  let sessionsList = [];
  try {
    const qSess = query(collection(db, 'attendanceSessions'), where('date', '==', targetDate));
    const sessSnap = await getDocs(qSess);
    sessionsList = sessSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Error getting attendance sessions:", err.message);
  }

  // Map staff to attendance status
  const mapped = allStaff.map(staff => {
    const record = attendanceList.find(a => a.staffId === staff.id);
    const staffSessions = sessionsList.filter(s => s.staffId === staff.id);

    if (record) {
      return {
        ...record,
        staff,
        sessions: staffSessions
      };
    } else {
      return {
        id: `${staff.id}_${targetDate}`,
        staffId: staff.id,
        staffCode: staff.staffCode,
        staffName: `${staff.firstName} ${staff.lastName}`,
        staffPhoto: staff.photoUrl,
        department: staff.department,
        branch: staff.branch,
        date: targetDate,
        firstArrival: null,
        lastScan: null,
        currentStatus: 'absent',
        totalMinutesToday: 0,
        sessionsCount: 0,
        hasOpenSession: false,
        staff,
        sessions: []
      };
    }
  });

  return mapped;
}

/**
 * Manual attendance correction in Firestore
 */
export async function correctAttendanceSession({
  staffId,
  date,
  sessionId,
  newClockIn,
  newClockOut,
  reason,
  actorEmail = 'manager'
}) {
  if (!reason || reason.trim().length < 5) {
    throw new Error('A detailed reason (minimum 5 characters) is mandatory for attendance corrections.');
  }

  let oldVal = {};
  let newVal = {};

  const sessRef = doc(db, 'attendanceSessions', sessionId);
  const sessSnap = await getDoc(sessRef);

  if (sessSnap.exists()) {
    const session = sessSnap.data();
    oldVal = { clockIn: session.clockIn, clockOut: session.clockOut };
    
    const clockIn = newClockIn || session.clockIn;
    const clockOut = newClockOut || session.clockOut;
    let durationMinutes = 0;
    let status = 'open';

    if (clockIn && clockOut) {
      durationMinutes = calculateMinutes(clockIn, clockOut);
      status = 'closed';
    }

    const updatedSession = {
      ...session,
      clockIn,
      clockOut,
      durationMinutes,
      status,
      corrected: true
    };
    await setDoc(sessRef, updatedSession);
    newVal = { clockIn, clockOut };
  } else {
    // Create new corrected session
    const durationMins = (newClockIn && newClockOut) ? calculateMinutes(newClockIn, newClockOut) : 0;
    const newSess = {
      id: sessionId || `sess-corrected-${Date.now()}`,
      staffId,
      date,
      clockIn: newClockIn,
      clockOut: newClockOut,
      durationMinutes: durationMins,
      status: (newClockIn && newClockOut) ? 'closed' : 'open',
      corrected: true
    };
    await setDoc(doc(db, 'attendanceSessions', newSess.id), newSess);
    newVal = { clockIn: newClockIn, clockOut: newClockOut };
  }

  // Recalculate daily attendance total in Firestore
  const qSess = query(
    collection(db, 'attendanceSessions'),
    where('staffId', '==', staffId),
    where('date', '==', date)
  );
  const allDaySessSnap = await getDocs(qSess);
  const staffDaySessions = allDaySessSnap.docs.map(d => d.data());

  const totalMins = staffDaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const hasOpen = staffDaySessions.some(s => s.status === 'open');

  const dailyDocId = `${staffId}_${date}`;
  const dailyRef = doc(db, 'attendance', dailyDocId);
  const dailySnap = await getDoc(dailyRef);
  if (dailySnap.exists()) {
    await updateDoc(dailyRef, {
      totalMinutesToday: totalMins,
      hasOpenSession: hasOpen,
      currentStatus: hasOpen ? 'working' : 'outside',
      updatedAt: new Date().toISOString()
    });
  }

  // Record Audit Log
  await createAuditLog({
    action: 'ATTENDANCE_CORRECTION',
    targetId: staffId,
    details: {
      date,
      sessionId,
      oldValue: oldVal,
      newValue: newVal,
      reason
    },
    actorEmail
  });

  return true;
}

/**
 * Gets actual total hours worked by a staff member in a specific month directly from Firestore
 */
export async function getStaffMonthlyHours(staffId, year, month) {
  try {
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const prefix = `${year}-${monthStr}`;
    
    const q = query(collection(db, 'attendance'), where('staffId', '==', staffId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      let totalMinutes = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.date && data.date.startsWith(prefix)) {
          totalMinutes += (data.totalMinutesToday || 0);
        }
      });
      return Math.round(totalMinutes / 60);
    }
  } catch (err) {
    console.warn("Firestore error getting monthly hours:", err.message);
  }
  
  return 0;
}
