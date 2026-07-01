import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveAsyncViewState, toUserFacingError } from '../src/utils/view-state.js'

test('resolveAsyncViewState shows blocking loading before content exists', () => {
  assert.deepEqual(resolveAsyncViewState({ isLoading: true, hasContent: false }), {
    status: 'loading',
    message: '',
    blocking: true
  })
})

test('resolveAsyncViewState shows blocking error before content exists', () => {
  assert.deepEqual(resolveAsyncViewState({ isLoading: true, error: '网络异常', hasContent: false }), {
    status: 'error',
    message: '网络异常',
    blocking: true
  })
})

test('resolveAsyncViewState keeps stale content visible during background errors', () => {
  assert.deepEqual(resolveAsyncViewState({ error: '同步失败', hasContent: true }), {
    status: 'ready',
    message: '同步失败',
    blocking: false
  })
})

test('resolveAsyncViewState exposes empty after data has loaded', () => {
  assert.deepEqual(resolveAsyncViewState({ isEmpty: true, hasContent: true }), {
    status: 'empty',
    message: '',
    blocking: false
  })
})

test('toUserFacingError normalizes useful messages and fallbacks', () => {
  assert.equal(toUserFacingError(new Error('请求超时')), '请求超时')
  assert.equal(toUserFacingError('  无法连接服务器  '), '无法连接服务器')
  assert.equal(toUserFacingError(null, '默认错误'), '默认错误')
})
