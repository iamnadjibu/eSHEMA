import { createAuditLog } from './auditService';

const RATINGS_LOCAL_KEY = 'eshema_performance_ratings';

function getLocalRatings() {
  const data = localStorage.getItem(RATINGS_LOCAL_KEY);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

function saveLocalRatings(ratingsObj) {
  localStorage.setItem(RATINGS_LOCAL_KEY, JSON.stringify(ratingsObj));
}

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
 * Gets Performance Rating for a staff member for a specific month
 */
export function getPerformanceRating(staffId, monthYear = '2026-08') {
  const allRatings = getLocalRatings();
  const key = `${staffId}_${monthYear}`;
  return allRatings[key] || null;
}

/**
 * Saves/Updates Performance Rating for a staff member
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

  const ratingRecord = {
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

  const allRatings = getLocalRatings();
  const key = `${staffId}_${monthYear}`;
  allRatings[key] = ratingRecord;
  saveLocalRatings(allRatings);

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
