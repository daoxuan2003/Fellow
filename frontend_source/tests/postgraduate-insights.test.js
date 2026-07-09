import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildArchiveRepositoryView,
  buildPostgraduateDashboard,
  buildPostgraduateNotifyTemplates,
  buildSubjectExecutionCards,
  mergeTodayStudyTasks
} from '../src/utils/postgraduate-insights.js'

const sampleData = {
  daysLeft: 120,
  todayCheckedIn: true,
  todayCompletionRate: 75,
  streak: 6,
  todayTasks: [
    { subjectName: '数学', taskKey: 'math_lecture', label: '完成课程', unit: '讲', targetAmount: 1, cadenceDays: 2, cadenceLabel: '每2天' },
    { subjectName: '英语', taskKey: 'english_questions', label: '刷题', unit: '题', targetAmount: 40, cadenceDays: 1, cadenceLabel: '每天' }
  ],
  todayCheckIn: {
    taskRecords: [
      { subjectName: '数学', taskKey: 'math_lecture', targetAmount: 1, completedAmount: 1, status: 'done' },
      { subjectName: '英语', taskKey: 'english_questions', targetAmount: 40, completedAmount: 20, status: 'partial' }
    ]
  },
  subjects: [
    {
      name: '数学',
      currentRound: 0,
      rounds: [{ roundName: '一轮', progress: 30, currentUnit: '第12讲', totalUnit: '80讲' }],
      tasks: [{ label: '完成课程', targetAmount: 1, unit: '讲', cadenceDays: 2, enabled: true }]
    },
    {
      name: '英语',
      currentRound: 0,
      rounds: [{ roundName: '真题', progress: 45, currentUnit: '阅读', totalUnit: '20套' }],
      tasks: [{ label: '刷题', targetAmount: 40, unit: '题', cadenceDays: 1, enabled: true }]
    }
  ],
  checkIns: [
    {
      date: '2026-07-01',
      taskRecords: [
        { subjectName: '数学', targetAmount: 1, completedAmount: 1, status: 'done' },
        { subjectName: '英语', targetAmount: 40, completedAmount: 20, status: 'partial' }
      ]
    }
  ],
  archiveRepository: {
    name: '2027考研全过程档案',
    entries: []
  }
}

test('postgraduate dashboard merges planned tasks with check-in records', () => {
  const rows = mergeTodayStudyTasks(sampleData)

  assert.equal(rows.length, 2)
  assert.equal(rows[0].status, 'done')
  assert.equal(rows[1].status, 'partial')
  assert.equal(rows[1].statusLabel, '还差 20题')
})

test('postgraduate dashboard surfaces remaining work and completion pressure', () => {
  const dashboard = buildPostgraduateDashboard(sampleData)

  assert.equal(dashboard.completionRate, 75)
  assert.equal(dashboard.doneTasks, 1)
  assert.equal(dashboard.remainingTasks, 1)
  assert.equal(dashboard.tone, 'partial')
  assert.match(dashboard.subline, /还有 1 项/)
})

test('postgraduate subject cards summarize cadence and historical completion', () => {
  const cards = buildSubjectExecutionCards(sampleData)
  const math = cards.find(card => card.name === '数学')

  assert.equal(math.todayDue, true)
  assert.equal(math.todayDoneCount, 1)
  assert.equal(math.taskSummary, '每2天 1讲')
  assert.equal(math.averageCompletion, 100)
})

test('postgraduate archive view keeps latest repository entry first', () => {
  const view = buildArchiveRepositoryView({
    name: '考研全过程档案',
    entries: [
      { repositoryName: '旧档案', archivedAt: '2026-01-01T00:00:00.000Z', summary: { totalDays: 3 } },
      { repositoryName: '新档案', archivedAt: '2026-02-01T00:00:00.000Z', summary: { totalDays: 5 } }
    ]
  })

  assert.equal(view.count, 2)
  assert.equal(view.latest.repositoryName, '新档案')
  assert.equal(view.entries[0].summary.totalDays, 5)
})

test('postgraduate notification templates focus on unfinished concrete tasks', () => {
  const dashboard = buildPostgraduateDashboard(sampleData)
  const templates = buildPostgraduateNotifyTemplates(sampleData, dashboard)

  assert.equal(templates.length, 2)
  assert.match(templates[0].body, /完成率 75%/)
  assert.match(templates[0].body, /英语刷题40题/)
  assert.match(templates[1].body, /英语刷题40题/)
})

test('postgraduate notification templates distinguish setup from rest day', () => {
  const setupDashboard = buildPostgraduateDashboard({})
  const setupTemplates = buildPostgraduateNotifyTemplates({}, setupDashboard)
  const restData = { todaySubjects: ['休息'], subjects: sampleData.subjects }
  const restTemplates = buildPostgraduateNotifyTemplates(restData, buildPostgraduateDashboard(restData))

  assert.equal(setupDashboard.tone, 'setup')
  assert.equal(setupTemplates[0].title, '先配置每日任务')
  assert.equal(restTemplates[0].title, '今天按计划休整')
})
