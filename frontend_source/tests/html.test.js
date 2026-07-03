import test from 'node:test'
import assert from 'node:assert/strict'

import { escapeHtml } from '../src/utils/html.js'

test('escapeHtml escapes markup and script-sensitive characters', () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('x')">&`),
    '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;'
  )
})

test('escapeHtml tolerates empty values', () => {
  assert.equal(escapeHtml(null), '')
  assert.equal(escapeHtml(undefined), '')
})
