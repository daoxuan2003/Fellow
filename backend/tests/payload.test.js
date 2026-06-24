const test = require('node:test');
const assert = require('node:assert/strict');

const { pickAllowedFields } = require('../utils/payload');

test('pickAllowedFields keeps only explicit update fields', () => {
  const payload = pickAllowedFields(
    {
      restaurant: '小馆',
      date: '2026-06-24',
      wantToGoAgain: false,
      howWasIt: '',
      photos: [],
      coupleId: 'attacker_victim',
      createdBy: 'attacker',
      requestId: 'sync-token',
      ignoredUndefined: undefined
    },
    ['restaurant', 'date', 'wantToGoAgain', 'howWasIt', 'photos', 'ignoredUndefined']
  );

  assert.deepEqual(payload, {
    restaurant: '小馆',
    date: '2026-06-24',
    wantToGoAgain: false,
    howWasIt: '',
    photos: []
  });
});

test('pickAllowedFields tolerates empty and non-object input', () => {
  assert.deepEqual(pickAllowedFields(null, ['name']), {});
  assert.deepEqual(pickAllowedFields('name=bad', ['name']), {});
});
