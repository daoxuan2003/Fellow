import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildDailyEncouragement,
  getCalendarDateString,
  normalizeDailyTaskBoard,
  validateDailyTaskDraft
} from '../src/utils/postgraduate-daily-board.js'

const testDir = dirname(fileURLToPath(import.meta.url))

test('multi-line task draft creates several unique checklist items in one submission', () => {
  const result = validateDailyTaskDraft('看 3 个有机化学视频\n整理高数错题\n\n看 3 个有机化学视频')

  assert.equal(result.valid, true)
  assert.equal(result.count, 2)
  assert.deepEqual(result.items, ['看 3 个有机化学视频', '整理高数错题'])
})

test('calendar day follows Asia Shanghai instead of UTC slicing', () => {
  assert.equal(getCalendarDateString(new Date('2026-08-19T15:59:59Z')), '2026-08-19')
  assert.equal(getCalendarDateString(new Date('2026-08-19T16:00:01Z')), '2026-08-20')
})

test('task draft reports useful empty, length and batch-limit failures', () => {
  assert.match(validateDailyTaskDraft('  ').error, /先写下/)
  assert.match(validateDailyTaskDraft('长'.repeat(81)).error, /80/)
  assert.match(validateDailyTaskDraft(Array.from({ length: 13 }, (_, index) => `任务 ${index}`).join('\n')).error, /12/)
})

test('daily encouragement never fabricates completion for empty or zero-completion days', () => {
  const empty = buildDailyEncouragement({ total: 0, completed: 0 })
  const zero = buildDailyEncouragement({ total: 4, completed: 0 })

  assert.equal(empty.tone, 'neutral')
  assert.match(empty.detail, /没有留下任务/)
  assert.doesNotMatch(empty.title, /完成/)
  assert.equal(zero.tone, 'restart')
  assert.match(zero.detail, /4 项还没划掉/)
  assert.doesNotMatch(zero.title, /完成/)
})

test('daily encouragement changes with actual completed amount and all-done state', () => {
  assert.equal(buildDailyEncouragement({ total: 5, completed: 1 }).title, '昨天完成 1 项')
  assert.equal(buildDailyEncouragement({ total: 5, completed: 3 }).title, '昨天完成 3 项')
  assert.equal(buildDailyEncouragement({ total: 7, completed: 5 }).tone, 'strong')
  assert.equal(buildDailyEncouragement({ total: 4, completed: 4 }).title, '昨天 4 项全部完成')
})

test('board normalization derives truthful totals from task records', () => {
  const board = normalizeDailyTaskBoard({
    today: { total: 99, completed: 99, tasks: [{ id: '1', completed: true }, { id: '2', completed: false }] },
    yesterday: { tasks: [] }
  })

  assert.equal(board.today.total, 2)
  assert.equal(board.today.completed, 1)
  assert.equal(board.yesterday.readOnly, true)
})

test('postgraduate view puts the collaborative board before progress and keeps yesterday controls read only', async () => {
  const source = await readFile(join(testDir, '..', 'src', 'views', 'Postgraduate.vue'), 'utf8')

  assert.ok(source.indexOf('class="pg-daily-board"') < source.indexOf('class="pg-intro"'))
  assert.ok(source.indexOf('class="pg-task-launch"') < source.indexOf('<Teleport to="body">'))
  assert.ok(source.indexOf('id="pg-task-draft"') > source.indexOf('<Teleport to="body">'))
  assert.match(source, /role="tablist"/)
  assert.match(source, /ArrowLeft.*ArrowRight.*Home.*End/)
  assert.match(source, /activeTaskTab === 'today'/)
  assert.match(source, /aria-haspopup="dialog"/)
  assert.match(source, /role="dialog"[\s\S]*aria-modal="true"/)
  assert.match(source, /event\.key === 'Escape'/)
  assert.match(source, /document\.body\.style\.overflow = 'hidden'/)
  assert.match(source, /taskComposerTrigger\.value\?\.focus/)
  assert.match(source, /每行一项/)
  assert.match(source, /postgraduate\/daily-tasks/)
  assert.match(source, /task\.canToggle/)
  assert.match(source, /task\.canDelete/)
  assert.match(source, /line-through/)
  assert.match(source, /postgraduateSync/)
})
