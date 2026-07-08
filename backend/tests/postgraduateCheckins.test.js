const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateStreak,
  filterUserCheckIns,
  findUserCheckIn,
  shiftDateString
} = require('../utils/postgraduateCheckins');

test('postgraduate check-ins are scoped by acting user', () => {
  const checkIns = [
    { date: '2026-06-26', userId: 'user-a', note: 'mine' },
    { date: '2026-06-26', userId: 'user-b', note: 'partner' },
    { date: '2026-06-25', userId: 'user-a' },
    { date: '2026-06-24' }
  ];

  assert.equal(findUserCheckIn(checkIns, 'user-a', '2026-06-26').note, 'mine');
  assert.equal(findUserCheckIn(checkIns, 'user-b', '2026-06-26').note, 'partner');
  assert.deepEqual(
    filterUserCheckIns(checkIns, 'user-a').map((checkIn) => checkIn.date),
    ['2026-06-26', '2026-06-25', '2026-06-24']
  );
  assert.equal(calculateStreak(checkIns, { userId: 'user-a', today: '2026-06-26' }), 3);
  assert.equal(calculateStreak(checkIns, { userId: 'user-b', today: '2026-06-26' }), 1);
});

test('legacy postgraduate check-ins remain readable until migrated', () => {
  const checkIns = [
    { date: '2026-06-26', subjects: ['政治'], note: 'legacy' },
    { date: '2026-06-25', userId: 'user-a', subjects: ['英语'] }
  ];

  assert.equal(findUserCheckIn(checkIns, 'user-a', '2026-06-26').note, 'legacy');
  assert.equal(calculateStreak(checkIns, { userId: 'user-a', today: '2026-06-26' }), 2);
});

test('date string shifting is timezone-independent', () => {
  assert.equal(shiftDateString('2026-03-01', -1), '2026-02-28');
  assert.equal(shiftDateString('2026-12-31', 1), '2027-01-01');
});
