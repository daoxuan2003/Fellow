import test from 'node:test'
import assert from 'node:assert/strict'

import { canManageCreatedRecord } from '../src/utils/ownership.js'

test('canManageCreatedRecord allows only the record creator', () => {
  assert.equal(canManageCreatedRecord({ createdBy: 'user-a' }, 'user-a'), true)
  assert.equal(canManageCreatedRecord({ createdBy: 'user-b' }, 'user-a'), false)
})

test('canManageCreatedRecord requires both creator and current user', () => {
  assert.equal(canManageCreatedRecord(null, 'user-a'), false)
  assert.equal(canManageCreatedRecord({}, 'user-a'), false)
  assert.equal(canManageCreatedRecord({ createdBy: 'user-a' }, ''), false)
})

test('canManageCreatedRecord compares ids by normalized string value', () => {
  assert.equal(canManageCreatedRecord({ createdBy: 123 }, '123'), true)
})
