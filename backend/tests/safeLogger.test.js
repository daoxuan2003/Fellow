const test = require('node:test');
const assert = require('node:assert/strict');

const { redactText, sanitizeError } = require('../utils/safeLogger');

test('safe logger redacts credential URLs, tokens and secret fields', () => {
  const raw = [
    'mongodb://user:password@private-host/app',
    'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.s5K6aI2ZtZupkZ6ux1KAFkXfFj6mKk3W7vJpF3S8q9Q',
    'password=plain-secret',
    'pairCode: ABC123'
  ].join(' ');

  const safe = redactText(raw);

  assert.equal(safe.includes('private-host'), false);
  assert.equal(safe.includes('plain-secret'), false);
  assert.equal(safe.includes('ABC123'), false);
  assert.equal(safe.includes('eyJhbGciOiJIUzI1NiJ9'), false);
});

test('safe logger sanitizes error payloads without exposing the raw message', () => {
  const error = new Error('mongodb://user:password@private-host/app failed token=abc123');
  const safe = sanitizeError(error);
  const text = JSON.stringify(safe);

  assert.equal(text.includes('private-host'), false);
  assert.equal(text.includes('password@'), false);
  assert.equal(text.includes('abc123'), false);
  assert.equal(safe.name, 'Error');
});
