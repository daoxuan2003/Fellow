import test from 'node:test'
import assert from 'node:assert/strict'

import { canDeleteWish } from '../src/utils/wish-permissions.js'

test('canDeleteWish allows only the creator to delete a wish', () => {
  assert.equal(canDeleteWish({ createdBy: 'user-a' }, 'user-a'), true)
  assert.equal(canDeleteWish({ createdBy: 'user-b' }, 'user-a'), false)
})

test('canDeleteWish tolerates missing wish or identity data', () => {
  assert.equal(canDeleteWish(null, 'user-a'), false)
  assert.equal(canDeleteWish({}, 'user-a'), false)
  assert.equal(canDeleteWish({ createdBy: 'user-a' }, ''), false)
})

test('canDeleteWish compares non-string ids by value', () => {
  assert.equal(canDeleteWish({ createdBy: 123 }, '123'), true)
})
