import test from 'node:test'
import assert from 'node:assert/strict'
import { extractPickupCode, matchPickupLocation, recognizePickupDetails } from '../src/utils/pickup-code.js'

test('extractPickupCode recognizes labeled and cabinet-style pickup codes', () => {
  assert.equal(extractPickupCode('您的快递已到，取件码：8-2-1234，请及时领取'), '8-2-1234')
  assert.equal(extractPickupCode('凭 A7B92C 到北门驿站取件'), 'A7B92C')
  assert.equal(extractPickupCode('菜鸟柜 12－8－66 已入柜'), '12-8-66')
})

test('extractPickupCode avoids treating ordinary phone numbers as pickup codes', () => {
  assert.equal(extractPickupCode('联系电话 13800138000，请到前台领取'), '')
})

test('recognizePickupDetails matches the longest saved location in the message', () => {
  const locations = [{ name: '北门' }, { name: '北门菜鸟驿站' }, { name: '东区快递柜' }]
  assert.equal(matchPickupLocation('请到北门菜鸟驿站领取', locations), '北门菜鸟驿站')
  assert.deepEqual(recognizePickupDetails('取件码 3-4-889，请到东区快递柜取件', locations), {
    code: '3-4-889',
    location: '东区快递柜'
  })
})
