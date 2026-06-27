const { getTodayString } = require('./helpers');

function hasUserId(checkIn) {
  return checkIn?.userId !== undefined && checkIn.userId !== null && String(checkIn.userId) !== '';
}

function belongsToUser(checkIn, userId) {
  return hasUserId(checkIn) && String(checkIn.userId) === String(userId);
}

function isLegacyCheckIn(checkIn) {
  return checkIn && !hasUserId(checkIn);
}

function filterUserCheckIns(checkIns, userId, { includeLegacy = true } = {}) {
  if (!Array.isArray(checkIns)) return [];

  return checkIns.filter((checkIn) => (
    belongsToUser(checkIn, userId) || (includeLegacy && isLegacyCheckIn(checkIn))
  ));
}

function findUserCheckIn(checkIns, userId, date) {
  if (!Array.isArray(checkIns)) return null;

  const userCheckIn = checkIns.find((checkIn) => (
    checkIn.date === date && belongsToUser(checkIn, userId)
  ));
  if (userCheckIn) return userCheckIn;

  return checkIns.find((checkIn) => checkIn.date === date && isLegacyCheckIn(checkIn)) || null;
}

function shiftDateString(dateString, offsetDays) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString || '');
  if (!match) return '';

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, monthIndex, day + offsetDays));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
}

function calculateStreak(checkIns, { userId, today = getTodayString(), includeLegacy = true } = {}) {
  const scopedCheckIns = userId
    ? filterUserCheckIns(checkIns, userId, { includeLegacy })
    : (Array.isArray(checkIns) ? checkIns : []);
  const dates = new Set(scopedCheckIns.map((checkIn) => checkIn.date).filter(Boolean));

  let cursor = dates.has(today) ? today : shiftDateString(today, -1);
  if (!dates.has(cursor)) return 0;

  let streak = 0;
  while (cursor && dates.has(cursor)) {
    streak += 1;
    cursor = shiftDateString(cursor, -1);
  }

  return streak;
}

module.exports = {
  calculateStreak,
  filterUserCheckIns,
  findUserCheckIn,
  shiftDateString
};
