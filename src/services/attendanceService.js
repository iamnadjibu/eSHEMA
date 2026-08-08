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
import { getStaffByCode, getStaffById, getAllStaff } from './staffService';
import { createAuditLog } from './auditService';

const ATTENDANCE_LOCAL_KEY = 'eshema_attendance_db';
const SESSIONS_LOCAL_KEY = 'eshema_sessions_db';

/**
 * Gets local attendance records
 */
function getLocalAttendance() {
  const data = localStorage.getItem(ATTENDANCE_LOCAL_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

/**
 * Gets local sessions records
 */
function getLocalSessions() {
  const data = localStorage.getItem(SESSIONS_LOCAL_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveLocalAttendance(list) {
  localStorage.setItem(ATTENDANCE_LOCAL_KEY, JSON.stringify(list));
}

function saveLocalSessions(list) {
  localStorage.setItem(SESSIONS_LOCAL_KEY, JSON.stringify(list));
}

/**
 * Process a barcode scan on the ATTENDANCE SCANNER page.
 * Uses alternating IN / OUT session logic.
 */
export async function processAttendanceScan(staffCode, operatorEmail = 'scanner-station') {
  if (!staffCode) {
    throw new Error('No barcode scanned');
  }

  // 1. Find staff member
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

  // 2. Fetch today's attendance record and sessions for this staff
  const attendanceList = getLocalAttendance();
  const sessionsList = getLocalSessions();

  let dailyRecord = attendanceList.find(a => a.staffId === staff.id && a.date === todayDate);
  const openSessionIndex = sessionsList.findIndex(s => s.staffId === staff.id && s.date === todayDate && s.status === 'open');

  let scanType = 'IN';
  let currentSessionDuration = '0h 00m';
  let updatedTotalMinutes = 0;

  if (!dailyRecord) {
    // 1st scan of the day -> CLOCK IN
    scanType = 'IN';
    const newSession = {
      id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      staffId: staff.id,
      staffCode: staff.staffCode,
      date: todayDate,
      clockIn: nowIso,
      clockOut: null,
      durationMinutes: 0,
      status: 'open',
      corrected: false
    };

    sessionsList.push(newSession);

    dailyRecord = {
      id: `${staff.id}_${todayDate}`,
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

    attendanceList.push(dailyRecord);

  } else if (openSessionIndex !== -1) {
    // Open session exists -> CLOCK OUT
    scanType = 'OUT';
    const activeSession = sessionsList[openSessionIndex];
    const sessionMins = calculateMinutes(activeSession.clockIn, nowIso);
    
    activeSession.clockOut = nowIso;
    activeSession.durationMinutes = sessionMins;
    activeSession.status = 'closed';

    currentSessionDuration = formatHoursMinutes(sessionMins);

    const closedSessions = sessionsList.filter(s => s.staffId === staff.id && s.date === todayDate && s.status === 'closed');
    updatedTotalMinutes = closedSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

    dailyRecord.lastScan = nowIso;
    dailyRecord.currentStatus = 'outside';
    dailyRecord.totalMinutesToday = updatedTotalMinutes;
    dailyRecord.hasOpenSession = false;
    dailyRecord.updatedAt = nowIso;

  } else {
    // No open session exists -> Next scan -> CLOCK IN
    scanType = 'IN';
    const newSession = {
      id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      staffId: staff.id,
      staffCode: staff.staffCode,
      date: todayDate,
      clockIn: nowIso,
      clockOut: null,
      durationMinutes: 0,
      status: 'open',
      corrected: false
    };

    sessionsList.push(newSession);

    const closedSessions = sessionsList.filter(s => s.staffId === staff.id && s.date === todayDate && s.status === 'closed');
    updatedTotalMinutes = closedSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

    dailyRecord.lastScan = nowIso;
    dailyRecord.currentStatus = 'working';
    dailyRecord.sessionsCount = (dailyRecord.sessionsCount || 0) + 1;
    dailyRecord.hasOpenSession = true;
    dailyRecord.updatedAt = nowIso;
  }

  saveLocalAttendance(attendanceList);
  saveLocalSessions(sessionsList);

  // Firestore async write with 1s timeout race
  Promise.race([
    setDoc(doc(db, 'attendance', dailyRecord.id), dailyRecord),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 1000))
  ]).catch(e => console.warn("Firestore sync skipped:", e.message));

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
 * Gets attendance records for today or date range
 */
export async function getTodayAttendance(targetDate = getTodayDateString()) {
  const rawStaff = await getAllStaff();
  const allStaff = Array.isArray(rawStaff) ? rawStaff : [];
  const attendanceList = getLocalAttendance().filter(a => a.date === targetDate);
  const sessionsList = getLocalSessions().filter(s => s.date === targetDate);

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
 * Manual attendance correction by authorized manager
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

  const sessionsList = getLocalSessions();
  const sessionIndex = sessionsList.findIndex(s => s.id === sessionId);

  let oldVal = {};
  let newVal = {};

  if (sessionIndex !== -1) {
    const session = sessionsList[sessionIndex];
    oldVal = { clockIn: session.clockIn, clockOut: session.clockOut };
    
    session.clockIn = newClockIn || session.clockIn;
    session.clockOut = newClockOut || session.clockOut;
    
    if (session.clockIn && session.clockOut) {
      session.durationMinutes = calculateMinutes(session.clockIn, session.clockOut);
      session.status = 'closed';
    } else {
      session.status = 'open';
      session.durationMinutes = 0;
    }
    session.corrected = true;
    newVal = { clockIn: session.clockIn, clockOut: session.clockOut };
  } else {
    // Create new corrected session
    const durationMins = (newClockIn && newClockOut) ? calculateMinutes(newClockIn, newClockOut) : 0;
    const newSess = {
      id: `sess-corrected-${Date.now()}`,
      staffId,
      date,
      clockIn: newClockIn,
      clockOut: newClockOut,
      durationMinutes: durationMins,
      status: (newClockIn && newClockOut) ? 'closed' : 'open',
      corrected: true
    };
    sessionsList.push(newSess);
    newVal = { clockIn: newClockIn, clockOut: newClockOut };
  }

  saveLocalSessions(sessionsList);

  // Recalculate daily attendance total
  const attendanceList = getLocalAttendance();
  const attIndex = attendanceList.findIndex(a => a.staffId === staffId && a.date === date);

  const staffDaySessions = sessionsList.filter(s => s.staffId === staffId && s.date === date);
  const totalMins = staffDaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const hasOpen = staffDaySessions.some(s => s.status === 'open');

  if (attIndex !== -1) {
    attendanceList[attIndex].totalMinutesToday = totalMins;
    attendanceList[attIndex].hasOpenSession = hasOpen;
    attendanceList[attIndex].currentStatus = hasOpen ? 'working' : 'outside';
    saveLocalAttendance(attendanceList);
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
