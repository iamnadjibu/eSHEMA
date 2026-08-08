import { DEFAULT_TIMEZONE } from './constants';

/**
 * Gets current date string formatted as YYYY-MM-DD in specified timezone (default Africa/Kigali)
 * @param {Date} [date]
 * @returns {string} e.g. "2026-08-08"
 */
export function getTodayDateString(date = new Date()) {
  const options = { timeZone: DEFAULT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD
  return formatter.format(date);
}

/**
 * Gets current time string formatted as HH:mm in Rwanda timezone
 * @param {Date|number} [date]
 * @returns {string} e.g. "08:02"
 */
export function formatTimeString(date = new Date()) {
  if (!date) return '-';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  const options = { timeZone: DEFAULT_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false };
  return new Intl.DateTimeFormat('en-GB', options).format(d);
}

/**
 * Formats full datetime string
 * @param {Date|number|string} date 
 * @returns {string} e.g. "Aug 8, 2026, 08:02"
 */
export function formatDateTimeString(date) {
  if (!date) return '-';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const options = { 
    timeZone: DEFAULT_TIMEZONE, 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  };
  return new Intl.DateTimeFormat('en-US', options).format(d);
}

/**
 * Calculates duration in minutes between two timestamps
 * @param {Date|number|string} start 
 * @param {Date|number|string} [end] Defaults to current time if null/undefined
 * @returns {number} minutes
 */
export function calculateMinutes(start, end = new Date()) {
  if (!start) return 0;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const diffMs = Math.max(0, endTime - startTime);
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * Converts total minutes into human readable "Xh Ym" format
 * @param {number} totalMinutes 
 * @returns {string} e.g. "8h 08m", "0h 45m"
 */
export function formatHoursMinutes(totalMinutes) {
  const mins = Math.max(0, Math.round(totalMinutes || 0));
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins.toString().padStart(2, '0')}m`;
}

/**
 * Returns expected institution working hours for a specific date:
 * - Mon-Thu: 2 hours
 * - Friday: 0 hours (OFF DAY)
 * - Sat-Sun: 4 hours
 * @param {Date|string} [date] 
 * @returns {{ hours: number, minutes: number, isOffDay: boolean, label: string }}
 */
export function getExpectedHoursForDate(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat

  if (dayOfWeek === 5) {
    // Friday -> OFF DAY (0 hrs)
    return { hours: 0, minutes: 0, isOffDay: true, label: 'Institution Off Day (0h)' };
  } else if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Weekend (Sat, Sun) -> 4 hrs
    return { hours: 4, minutes: 240, isOffDay: false, label: 'Weekend Shift (4h)' };
  } else {
    // Mon-Thu -> 2 hrs
    return { hours: 2, minutes: 120, isOffDay: false, label: 'Standard Shift (2h)' };
  }
}

/**
 * Calculates total expected institution working hours for an entire month
 * @param {number} [year] e.g. 2026
 * @param {number} [month] 0-indexed month (0 = Jan, 7 = Aug)
 * @returns {{ totalHours: number, totalMinutes: number, workingDaysCount: number }}
 */
export function getExpectedHoursForMonth(year = 2026, month = 7) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let totalMinutes = 0;
  let workingDaysCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const schedule = getExpectedHoursForDate(d);
    totalMinutes += schedule.minutes;
    if (!schedule.isOffDay) {
      workingDaysCount++;
    }
  }

  return {
    totalHours: Math.round(totalMinutes / 60),
    totalMinutes,
    workingDaysCount
  };
}

/**
 * Extracts uppercase initials from First Name and Last Name
 * e.g. "Jean Claude", "Karekezi" -> "JK"
 * @param {string} firstName 
 * @param {string} lastName 
 * @returns {string} e.g. "JK"
 */
export function getInitials(firstName = '', lastName = '') {
  const f = firstName.trim().charAt(0).toUpperCase();
  const l = lastName.trim().charAt(0).toUpperCase();
  if (f && l) return `${f}${l}`;
  if (f) return f;
  if (l) return l;
  return 'KSP';
}
