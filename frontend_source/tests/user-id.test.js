import test from 'node:test';
import assert from 'node:assert/strict';

import { clearStoredUserId, persistCurrentUserId, resolveCurrentUserId } from '../src/utils/user-id.js';

test('resolveCurrentUserId uses the Pinia current user getter first', () => {
  assert.equal(resolveCurrentUserId({
    currentUserId: 'me',
    userId: 'cached',
    user: { id: 'fallback' }
  }), 'me');
});

test('resolveCurrentUserId falls back to store state and local storage', () => {
  const storage = {
    getItem(key) {
      return key === 'currentUserId' ? 'stored-user' : null;
    }
  };

  assert.equal(resolveCurrentUserId({ user: { id: 'state-user' } }, storage), 'state-user');
  assert.equal(resolveCurrentUserId({}, storage), 'stored-user');
});

test('resolveCurrentUserId keeps legacy userId as the final fallback', () => {
  const storage = {
    getItem(key) {
      return key === 'userId' ? 'legacy-user' : null;
    }
  };

  assert.equal(resolveCurrentUserId({}, storage), 'legacy-user');
});

test('resolveCurrentUserId tolerates unavailable storage', () => {
  const storage = {
    getItem() {
      throw new Error('blocked');
    }
  };

  assert.equal(resolveCurrentUserId({}, storage), '');
});

test('persistCurrentUserId writes current and legacy storage keys', () => {
  const writes = [];
  const storage = {
    setItem(key, value) {
      writes.push([key, value]);
    }
  };

  assert.equal(persistCurrentUserId(123, storage), '123');
  assert.deepEqual(writes, [
    ['currentUserId', '123'],
    ['userId', '123']
  ]);
});

test('clearStoredUserId removes current and legacy storage keys', () => {
  const removed = [];
  const storage = {
    removeItem(key) {
      removed.push(key);
    }
  };

  clearStoredUserId(storage);
  assert.deepEqual(removed, ['currentUserId', 'userId']);
});
