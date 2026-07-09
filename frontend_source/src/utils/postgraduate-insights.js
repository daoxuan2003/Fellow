function asArray(value) {
  return Array.isArray(value) ? value : []
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function roundPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function recordKey(item) {
  return `${item.subjectName || ''}::${item.taskKey || ''}`
}

function formatNumber(value) {
  const number = toFiniteNumber(value)
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, '')
}

export function formatStudyAmount(amount, unit = '') {
  return `${formatNumber(amount)}${unit || ''}`
}

function resolveStatus(completedAmount, targetAmount, checkedIn) {
  if (!checkedIn) return 'pending'
  if (targetAmount <= 0 || completedAmount >= targetAmount) return 'done'
  if (completedAmount > 0) return 'partial'
  return 'missed'
}

function statusLabel(status, completedAmount, targetAmount, unit) {
  if (status === 'done') return '已完成'
  if (status === 'partial') return `还差 ${formatStudyAmount(Math.max(0, targetAmount - completedAmount), unit)}`
  if (status === 'missed') return '未完成'
  return '待报到'
}

export function mergeTodayStudyTasks(data = {}) {
  const plannedTasks = asArray(data.todayTasks)
  const checkedIn = !!data.todayCheckedIn
  const records = asArray(data.todayCheckIn?.taskRecords)
  const recordMap = new Map(records.map(record => [recordKey(record), record]))
  const plannedKeys = new Set()

  const taskRows = plannedTasks.map((task, index) => {
    const key = recordKey(task)
    plannedKeys.add(key)
    const record = recordMap.get(key)
    const targetAmount = Math.max(0, toFiniteNumber(record?.targetAmount ?? task.targetAmount, 0))
    const completedAmount = Math.max(0, toFiniteNumber(record?.completedAmount, 0))
    const status = record?.status || resolveStatus(completedAmount, targetAmount, checkedIn)
    const progressPercent = targetAmount <= 0 ? (completedAmount > 0 || status === 'done' ? 100 : 0) : roundPercent(Math.min(1, completedAmount / targetAmount) * 100)

    return {
      id: key || `${task.subjectName || 'subject'}-${index}`,
      subjectName: task.subjectName || record?.subjectName || '',
      taskKey: task.taskKey || record?.taskKey || '',
      label: task.label || record?.label || '学习任务',
      unit: task.unit || record?.unit || '',
      cadenceDays: toFiniteNumber(task.cadenceDays ?? record?.cadenceDays, 1),
      cadenceLabel: task.cadenceLabel || (toFiniteNumber(task.cadenceDays ?? record?.cadenceDays, 1) > 1 ? `每${task.cadenceDays || record?.cadenceDays}天` : '每天'),
      targetAmount,
      completedAmount,
      remainingAmount: Math.max(0, targetAmount - completedAmount),
      targetText: formatStudyAmount(targetAmount, task.unit || record?.unit || ''),
      completedText: formatStudyAmount(completedAmount, task.unit || record?.unit || ''),
      status,
      statusLabel: statusLabel(status, completedAmount, targetAmount, task.unit || record?.unit || ''),
      progressPercent
    }
  })

  records.forEach((record, index) => {
    const key = recordKey(record)
    if (plannedKeys.has(key)) return
    const targetAmount = Math.max(0, toFiniteNumber(record.targetAmount, 0))
    const completedAmount = Math.max(0, toFiniteNumber(record.completedAmount, 0))
    const status = record.status || resolveStatus(completedAmount, targetAmount, checkedIn)
    taskRows.push({
      id: key || `record-${index}`,
      subjectName: record.subjectName || '',
      taskKey: record.taskKey || '',
      label: record.label || '学习任务',
      unit: record.unit || '',
      cadenceDays: toFiniteNumber(record.cadenceDays, 1),
      cadenceLabel: toFiniteNumber(record.cadenceDays, 1) > 1 ? `每${record.cadenceDays}天` : '每天',
      targetAmount,
      completedAmount,
      remainingAmount: Math.max(0, targetAmount - completedAmount),
      targetText: formatStudyAmount(targetAmount, record.unit || ''),
      completedText: formatStudyAmount(completedAmount, record.unit || ''),
      status,
      statusLabel: statusLabel(status, completedAmount, targetAmount, record.unit || ''),
      progressPercent: targetAmount <= 0 ? (completedAmount > 0 || status === 'done' ? 100 : 0) : roundPercent(Math.min(1, completedAmount / targetAmount) * 100)
    })
  })

  return taskRows
}

function groupTasks(taskRows) {
  const groups = []
  const indexBySubject = new Map()
  taskRows.forEach(task => {
    const subjectName = task.subjectName || '未分组'
    if (!indexBySubject.has(subjectName)) {
      indexBySubject.set(subjectName, groups.length)
      groups.push({ subjectName, tasks: [] })
    }
    groups[indexBySubject.get(subjectName)].tasks.push(task)
  })
  return groups
}

function buildHeadline({ data, taskRows, completionRate, doneTasks, remainingTasks }) {
  const todaySubjects = asArray(data.todaySubjects)
  if (todaySubjects.includes('休息')) {
    return {
      tone: 'rest',
      headline: '今天按计划休整',
      subline: '休息日也会被记录在周计划里，明天继续推进。',
      actionLabel: '查看计划'
    }
  }
  if (taskRows.length === 0) {
    return {
      tone: 'setup',
      headline: '先把每日任务定清楚',
      subline: '为数学、英语、化学、政治设置数量和频率后，报到才有压力和反馈。',
      actionLabel: '配置计划'
    }
  }
  if (!data.todayCheckedIn) {
    return {
      tone: 'pending',
      headline: `今天有 ${taskRows.length} 项任务待报到`,
      subline: `先完成一项也要记录，别让今天从系统里空过去。`,
      actionLabel: '开始报到'
    }
  }
  if (remainingTasks === 0) {
    return {
      tone: 'done',
      headline: '今日任务闭环',
      subline: `完成 ${doneTasks}/${taskRows.length} 项，连续 ${data.streak || 0} 天保持节奏。`,
      actionLabel: '查看归档'
    }
  }
  return {
    tone: completionRate >= 60 ? 'partial' : 'risk',
    headline: `今日完成率 ${completionRate}%`,
    subline: `还有 ${remainingTasks} 项没有完全完成，现在补一项就能把节奏拉回来。`,
    actionLabel: '补充报到'
  }
}

export function buildPostgraduateDashboard(data = {}) {
  const taskRows = mergeTodayStudyTasks(data)
  const doneTasks = taskRows.filter(task => task.status === 'done').length
  const partialTasks = taskRows.filter(task => task.status === 'partial').length
  const missedTasks = taskRows.filter(task => task.status === 'missed').length
  const pendingTasks = taskRows.filter(task => task.status === 'pending').length
  const remainingTasks = taskRows.filter(task => task.status !== 'done').length
  const completionRate = taskRows.length
    ? roundPercent(taskRows.reduce((sum, task) => sum + task.progressPercent, 0) / taskRows.length)
    : roundPercent(data.todayCompletionRate || data.todayCheckIn?.completionRate || 0)
  const headline = buildHeadline({ data, taskRows, completionRate, doneTasks, remainingTasks })
  const daysLeft = data.daysLeft === null || data.daysLeft === undefined ? null : Math.max(0, toFiniteNumber(data.daysLeft, 0))

  return {
    ...headline,
    daysLeft,
    daysLeftLabel: daysLeft === null ? '未设置' : `${daysLeft}天`,
    completionRate,
    totalTasks: taskRows.length,
    doneTasks,
    partialTasks,
    missedTasks,
    pendingTasks,
    remainingTasks,
    taskRows,
    taskGroups: groupTasks(taskRows),
    streak: data.streak || 0,
    subjectCount: asArray(data.subjects).length,
    archiveCount: asArray(data.archiveRepository?.entries).length,
    checkedIn: !!data.todayCheckedIn
  }
}

function currentRound(subject = {}) {
  const rounds = asArray(subject.rounds)
  if (rounds.length === 0) {
    return {
      roundName: '一轮',
      progress: subject.progress || 0,
      currentUnit: subject.currentUnit || '',
      totalUnit: subject.totalUnit || ''
    }
  }
  const index = Math.max(0, Math.min(rounds.length - 1, Math.round(toFiniteNumber(subject.currentRound, 0))))
  return rounds[index] || rounds[0]
}

export function buildSubjectExecutionCards(data = {}) {
  const taskRows = mergeTodayStudyTasks(data)
  const checkIns = asArray(data.checkIns)
  return asArray(data.subjects).map(subject => {
    const round = currentRound(subject)
    const todayTasks = taskRows.filter(task => task.subjectName === subject.name)
    const records = checkIns.flatMap(checkIn => asArray(checkIn.taskRecords).filter(record => record.subjectName === subject.name))
    const doneRecords = records.filter(record => record.status === 'done').length
    const averageCompletion = records.length
      ? roundPercent(records.reduce((sum, record) => {
        const targetAmount = Math.max(0, toFiniteNumber(record.targetAmount, 0))
        const completedAmount = Math.max(0, toFiniteNumber(record.completedAmount, 0))
        return sum + (targetAmount <= 0 ? 100 : Math.min(100, completedAmount / targetAmount * 100))
      }, 0) / records.length)
      : 0
    const taskSummary = asArray(subject.tasks)
      .filter(task => task.enabled !== false)
      .slice(0, 3)
      .map(task => `${task.cadenceDays > 1 ? `每${task.cadenceDays}天` : '每天'} ${formatStudyAmount(task.targetAmount, task.unit)}`)
      .join(' / ')

    return {
      raw: subject,
      name: subject.name,
      color: subject.color || '#2563eb',
      icon: subject.icon || '',
      currentRound: round,
      progress: roundPercent(round.progress || 0),
      todayDue: todayTasks.length > 0,
      todayTaskCount: todayTasks.length,
      todayDoneCount: todayTasks.filter(task => task.status === 'done').length,
      taskSummary: taskSummary || '未设置督促任务',
      historicalTaskCount: records.length,
      doneRecords,
      averageCompletion
    }
  })
}

function formatArchiveDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function buildArchiveRepositoryView(repository = {}) {
  const entries = asArray(repository.entries)
    .map((entry, index) => ({
      id: entry._id || `${entry.repositoryName || 'archive'}-${index}`,
      repositoryName: entry.repositoryName || repository.name || '考研全过程档案',
      archivedAt: entry.archivedAt || '',
      archivedDate: formatArchiveDate(entry.archivedAt),
      targetDate: entry.targetDate || '',
      summary: entry.summary || {},
      snapshot: entry.snapshot || {}
    }))
    .sort((a, b) => String(b.archivedAt).localeCompare(String(a.archivedAt)))

  const latest = entries[0] || null
  return {
    name: repository.name || '考研全过程档案',
    status: repository.status || 'active',
    count: entries.length,
    latest,
    entries
  }
}

function taskListText(taskRows) {
  return taskRows
    .slice(0, 6)
    .map(task => `${task.subjectName}${task.label}${task.targetText}`)
    .join('；')
}

export function buildPostgraduateNotifyTemplates(data = {}, dashboard = buildPostgraduateDashboard(data)) {
  if (dashboard.totalTasks === 0) {
    if (dashboard.tone === 'setup') {
      return [
        {
          title: '先配置每日任务',
          body: '今天还没有可报到的任务，请先把数学、英语、化学、政治的数量和频率定下来。'
        }
      ]
    }
    return [
      {
        title: '今天按计划休整',
        body: '今天没有强制学习任务，整理错题、复盘计划或早点休息都算把节奏守住。'
      }
    ]
  }

  const remaining = dashboard.taskRows.filter(task => task.status !== 'done')
  const remainingText = taskListText(remaining.length > 0 ? remaining : dashboard.taskRows)
  const templates = [
    {
      title: dashboard.checkedIn ? '今日考研进度复盘' : '今日考研任务提醒',
      body: dashboard.checkedIn
        ? `今天完成率 ${dashboard.completionRate}%，${remaining.length > 0 ? `还差：${remainingText}` : '任务已经闭环。'}`
        : `今天还没报到，先完成这些：${remainingText}`
    },
    {
      title: '先完成最小闭环',
      body: `现在只盯一项：${remaining[0]?.subjectName || dashboard.taskRows[0]?.subjectName}${remaining[0]?.label || dashboard.taskRows[0]?.label}${remaining[0]?.targetText || dashboard.taskRows[0]?.targetText}。完成后马上报到。`
    }
  ]

  if (data.archiveReady) {
    templates.push({
      title: '考研全过程可以归档',
      body: '目标日期已到，可以把每日任务、完成率、备注和计划快照固化到专属档案。'
    })
  }

  return templates
}
