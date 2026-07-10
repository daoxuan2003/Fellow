const test = require('node:test');
const assert = require('node:assert/strict');

const { redactText, sanitizeError, sanitizeLogValue } = require('../utils/safeLogger');

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

test('safe logger sanitizes structured log metadata', () => {
  const safe = sanitizeLogValue({
    userId: 'user-1',
    endpoint: 'https://push.example/subscription-id',
    nested: {
      authorization: 'Bearer secret-token',
      keys: {
        p256dh: 'browser-key',
        auth: 'auth-secret'
      }
    }
  });

  const text = JSON.stringify(safe);
  assert.equal(text.includes('subscription-id'), false);
  assert.equal(text.includes('secret-token'), false);
  assert.equal(text.includes('browser-key'), false);
  assert.equal(text.includes('auth-secret'), false);
  assert.equal(safe.userId, 'user-1');
});
