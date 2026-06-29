import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveCurrentUserId } from '../src/utils/user-id.js';

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

test('resolveCurrentUserId tolerates unavailable storage', () => {
  const storage = {
    getItem() {
      throw new Error('blocked');
    }
  };

  assert.equal(resolveCurrentUserId({}, storage), '');
});
