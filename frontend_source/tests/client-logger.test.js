import test from 'node:test'
import assert from 'node:assert/strict'

import {
  isClientDebugEnabled,
  sanitizeLogValue
} from '../src/utils/client-logger.js'

test('sanitizeLogValue redacts urls tokens and sensitive object keys', () => {
  const value = sanitizeLogValue({
    endpoint: 'https://push.example.com/send/very-private-id?token=secret',
    authorization: 'Bearer abc.def.ghi',
    note: '请求 https://api.example.com/profile?access_token=secret 完成'
  })

  assert.equal(value.endpoint, '[redacted]')
  assert.equal(value.authorization, '[redacted]')
  assert.equal(value.note, '请求 https://api.example.com/[redacted] 完成')
})

test('sanitizeLogValue keeps error shape without exposing tokens', () => {
  const error = new Error('failed token=secret https://private.example.com/path')
  const value = sanitizeLogValue(error)

  assert.deepEqual(value, {
    name: 'Error',
    message: 'failed token=[redacted] https://private.example.com/[redacted]'
  })
})

test('sanitizeLogValue handles circular objects safely', () => {
  const value = { name: 'cache' }
  value.self = value

  assert.deepEqual(sanitizeLogValue(value), {
    name: 'cache',
    self: '[Circular]'
  })
})

test('client debug logging is disabled by default outside Vite dev mode', () => {
  assert.equal(isClientDebugEnabled(), false)
})
