import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildProgressTrack,
  getPostgraduatePlan,
  POSTGRADUATE_HOME_STATUS
} from '../src/data/postgraduate-plan.js'

const testDir = dirname(fileURLToPath(import.meta.url))

test('fixed postgraduate plan preserves the supplied study positions and totals', () => {
  const plan = getPostgraduatePlan()
  const organic = plan.subjects.find(subject => subject.id === 'organic-chemistry')
  const math = plan.subjects.find(subject => subject.id === 'math')
  const english = plan.subjects.find(subject => subject.id === 'english')
  const politics = plan.subjects.find(subject => subject.id === 'politics')

  assert.equal(plan.phase, '一轮复习')
  assert.equal(plan.subjectCount, 4)
  assert.deepEqual(organic.tracks.map(track => [track.current, track.total, track.percent]), [[6, 24, 25], [22, 75, 29]])
  assert.deepEqual(math.tracks.map(track => [track.current, track.total, track.percent]), [[8, 15, 53], [50, 108, 46]])
  assert.deepEqual(english.tracks.map(track => [track.current, track.total, track.percent]), [[3, 34, 9]])
  assert.deepEqual(politics.tracks.map(track => [track.current, track.total, track.percent]), [[6, 95, 6]])
  assert.equal(math.pending.value, '用书待定')
  assert.match(math.pending.note, /暂不计入数学进度/)
  assert.match(politics.note, /不按章节估算完成度/)
  assert.equal(POSTGRADUATE_HOME_STATUS, '一轮复习 · 4 科推进中')
})

test('progress feedback exposes an explicit completed state at one hundred percent', () => {
  const complete = buildProgressTrack({ label: '课程视频', current: 34, total: 34, unit: '个视频' })
  const active = buildProgressTrack({ label: '课程视频', current: 3, total: 34, unit: '个视频' })

  assert.equal(complete.complete, true)
  assert.equal(complete.percent, 100)
  assert.equal(complete.feedback, '已完成全部 34 个视频')
  assert.match(complete.ariaText, /完成100%/)
  assert.equal(active.complete, false)
  assert.equal(active.remaining, 31)
  assert.match(active.feedback, /还差 31 个视频/)
})

test('saved track values replace the fixed baseline without changing trusted totals', () => {
  const plan = getPostgraduatePlan({
    subjects: [{
      key: 'math',
      progressTracks: [
        { key: 'lectures', current: 10, total: 999 },
        { key: 'videos', current: 56, total: 999 }
      ]
    }]
  })
  const math = plan.subjects.find(subject => subject.id === 'math')

  assert.deepEqual(math.tracks.map(track => [track.current, track.total]), [[10, 15], [56, 108]])
  assert.match(math.currentSummary, /第 10 讲/)
  assert.match(math.currentSummary, /56 个视频/)
})

test('postgraduate view persists multi-unit progress and removes the old broad editor', async () => {
  const source = await readFile(join(testDir, '..', 'src', 'views', 'Postgraduate.vue'), 'utf8')

  assert.match(source, /getPostgraduatePlan/)
  assert.match(source, /role="progressbar"/)
  assert.match(source, /aria-valuetext/)
  assert.match(source, /prefers-reduced-motion/)
  assert.match(source, /method: 'PATCH'/)
  assert.match(source, /amount/)
  assert.match(source, /修正减少/)
  assert.match(source, /登记完成/)
  assert.doesNotMatch(source, /openConfig|openCheckIn|postgraduate\/checkin/)
  assert.match(source, /postgraduate\/daily-tasks/)
})
