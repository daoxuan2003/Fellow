import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

import { formatLocalDate } from '../src/utils/date.js'

function runDateFormatInTimezone(timeZone) {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "import { formatLocalDate } from './src/utils/date.js'; console.log(formatLocalDate(new Date('2026-06-23T16:30:00.000Z')))"
    ],
    {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, TZ: timeZone },
      encoding: 'utf8'
    }
  )

  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}

test('formatLocalDate uses the browser local calendar day instead of UTC slicing', () => {
  assert.equal(runDateFormatInTimezone('Asia/Shanghai'), '2026-06-24')
  assert.equal(runDateFormatInTimezone('UTC'), '2026-06-23')
})

test('formatLocalDate returns an empty string for empty or invalid input', () => {
  assert.equal(formatLocalDate(null), '')
  assert.equal(formatLocalDate('not-a-date'), '')
})
