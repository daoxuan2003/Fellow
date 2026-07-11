import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildPlanExecutionCard,
  buildPlansExecutionDashboard,
  getDueSubTasks
} from '../src/utils/plan-execution.js'

const fitnessHabit = {
  id: 'habit-fit',
  title: '周一力量训练',
  type: 'subtasks',
  participation: 'both',
  createdBy: 'me',
  frequency: 'weekly',
  weekdays: [1, 3],
  startDate: '2026-07-01',
  subTasks: [
    { id: 'warm', title: '动态热身', weekday: 1, groupId: 'warmup', groupTitle: '热身', targetValue: 8, unit: '分钟', order: 0 },
    { id: 'squat', title: '深蹲', weekday: 1, groupId: 'strength', groupTitle: '力量', targetValue: 4, unit: '组', order: 1 },
    { id: 'lunge', title: '箭步蹲', weekday: 1, groupId: 'strength', groupTitle: '力量', targetValue: 3, unit: '组', order: 2 },
    { id: 'row', title: '划船', weekday: 3, groupId: 'upper', groupTitle: '上肢', targetValue: 4, unit: '组', order: 0 }
  ]
}

test('plan execution filters sub tasks by local weekday', () => {
  const mondayTasks = getDueSubTasks(fitnessHabit, '2026-07-06')

  assert.deepEqual(mondayTasks.map(task => task.id), ['warm', 'squat', 'lunge'])
})

test('plan execution card summarizes group closure and next task', () => {
  const card = buildPlanExecutionCard(
    fitnessHabit,
    [{ habitId: 'habit-fit', userId: 'me', date: '2026-07-06', completedSubTasks: ['warm', 'squat', 'forged-task', 'warm'] }],
    'me',
    'partner',
    '2026-07-06'
  )

  assert.equal(card.state, 'partial')
  assert.equal(card.completionRate, 67)
  assert.equal(card.completedGroups, 1)
  assert.equal(card.totalGroups, 2)
  assert.equal(card.completedUnits, 2)
  assert.equal(card.nextTask.title, '箭步蹲')
  assert.match(card.summary, /1\/2 组闭环/)
})

test('plan execution dashboard focuses the unfinished active plan', () => {
  const dashboard = buildPlansExecutionDashboard(
    [
      fitnessHabit,
      { id: 'habit-read', title: '阅读', type: 'simple', participation: 'self', createdBy: 'me', frequency: 'daily' },
      { id: 'legacy-both', title: '老计划', type: 'simple', createdBy: 'partner', frequency: 'daily' }
    ],
    [
      { habitId: 'habit-fit', userId: 'me', date: '2026-07-06', completedSubTasks: ['warm'] },
      { habitId: 'habit-read', userId: 'me', date: '2026-07-06' },
      { habitId: 'legacy-both', userId: 'me', date: '2026-07-06' }
    ],
    'me',
    'partner',
    '2026-07-06'
  )

  assert.equal(dashboard.total, 3)
  assert.equal(dashboard.done, 2)
  assert.equal(dashboard.pending, 1)
  assert.equal(dashboard.completedUnits, 3)
  assert.equal(dashboard.totalUnits, 5)
  assert.equal(dashboard.completionRate, 60)
  assert.equal(dashboard.planCompletionRate, 67)
  assert.equal(dashboard.cards.some(card => card.id === 'legacy-both'), true)
  assert.equal(dashboard.focus.id, 'habit-fit')
  assert.match(dashboard.headline, /已推进 3\/5 项/)
  assert.match(dashboard.subline, /下一项/)
})

test('plan execution ignores inactive or partner-only tasks for current user dashboard', () => {
  const dashboard = buildPlansExecutionDashboard(
    [
      { ...fitnessHabit, weekdays: [3] },
      { id: 'partner-only', title: 'TA 的计划', type: 'simple', participation: 'partner', createdBy: 'me', frequency: 'daily' }
    ],
    [],
    'me',
    'partner',
    '2026-07-06'
  )

  assert.equal(dashboard.total, 0)
  assert.equal(dashboard.cards.length, 1)
  assert.equal(dashboard.cards[0].state, 'rest')
  assert.equal(dashboard.focus, null)
  assert.equal(dashboard.headline, '今天没有需要打卡的计划')
})
