const test = require('node:test');
const assert = require('node:assert/strict');

const { formatDate, getTodayString } = require('../utils/helpers');

test('date-only helpers use the requested calendar timezone', () => {
  const lateUtc = new Date('2026-06-23T16:30:00.000Z');

  assert.equal(formatDate(lateUtc, 'Asia/Shanghai'), '2026-06-24');
  assert.equal(formatDate(lateUtc, 'UTC'), '2026-06-23');
});

test('getTodayString can format a fixed instant without UTC slicing', () => {
  assert.equal(
    getTodayString(new Date('2026-12-31T16:10:00.000Z'), 'Asia/Shanghai'),
    '2027-01-01'
  );
});

test('formatDate returns an empty string for empty or invalid input', () => {
  assert.equal(formatDate(null), '');
  assert.equal(formatDate('not-a-date'), '');
});
