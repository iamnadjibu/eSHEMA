import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { createAuditLog } from './auditService';
import { getExpectedHoursForMonth } from '../utils/timeUtils';

/**
 * Calculates Attendance Rating according to eshema.skills and institution schedule:
 * Mon-Thu: 2h/day | Friday: 0h (Off Day) | Sat-Sun: 4h/day
 * Total monthly expected hours ~ 72 hours
 * Attendance Percentage = (Actual Hours Worked / Total Expected Schedule Hours) * 100
 * Attendance Rating = Attendance Percentage / 10 (e.g. 92% -> 9.2 / 10)
 */
export function calculateAttendanceMetrics(actualHoursWorked = 65, year = 2026, month = 7) {
  const schedule = getExpectedHoursForMonth(year, month);
  const expectedHours = schedule.totalHours || 72;
  
  const percentage = Math.min(100, Math.max(0, (actualHoursWorked / expectedHours) * 100));
  const rating = Number((percentage / 10).toFixed(1));
  
  return {
    percentage: Math.round(percentage),
    rating, // out of 10
    displayRating: `${rating} / 10`,
    actualHoursWorked,
    expectedHours,
    scheduleLabel: 'Mon-Thu: 2h, Fri: 0h (Off Day), Sat-Sun: 4h'
  };
}

/**
 * Gets Performance Rating for a staff member for a specific month directly from Firestore
 */
export async function getPerformanceRating(staffId, monthYear = '2026-08') {
  if (!staffId) return null;
  const key = `${staffId}_${monthYear}`;
  try {
    const docRef = doc(db, 'performanceRatings', key);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    console.warn("Firestore getPerformanceRating error:", err.message);
  }
  return null;
}

/**
 * Saves/Updates Performance Rating for a staff member directly in Firestore
 */
export async function savePerformanceRating({
  staffId,
  monthYear = '2026-08',
  punctuality = 8,
  productivity = 8,
  professionalism = 8,
  qualityOfWork = 8,
  teamwork = 8,
  notes = '',
  evaluatorEmail = 'manager@ksp.rw'
}) {
  const overall = Number(
    ((punctuality + productivity + professionalism + qualityOfWork + teamwork) / 5).toFixed(1)
  );

  const key = `${staffId}_${monthYear}`;
  const ratingRecord = {
    id: key,
    staffId,
    monthYear,
    scores: {
      punctuality,
      productivity,
      professionalism,
      qualityOfWork,
      teamwork
    },
    overallPerformanceRating: overall,
    displayOverall: `${overall} / 10`,
    notes,
    evaluatorEmail,
    updatedAt: new Date().toISOString()
  };

  // Direct Firestore write
  await setDoc(doc(db, 'performanceRatings', key), ratingRecord);

  await createAuditLog({
    action: 'SAVE_PERFORMANCE_RATING',
    targetId: staffId,
    details: {
      monthYear,
      overallScore: overall,
      notes
    },
    actorEmail: evaluatorEmail
  });

  return ratingRecord;
}
