function asArray(value) {
  return Array.isArray(value) ? value : []
}

function toId(value) {
  return value === undefined || value === null ? '' : String(value)
}

function habitId(habit = {}) {
  return toId(habit.id || habit._id)
}

function toDateOnly(dateStr) {
  const match = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null
  }
  return date
}

function weekdayOf(dateStr) {
  return toDateOnly(dateStr)?.getDay() ?? new Date().getDay()
}

function isDateInLeaves(dateStr, leaves = []) {
  return asArray(leaves).some(leave => dateStr >= leave.startDate && dateStr <= leave.endDate)
}

function isHabitDueForUser(habit = {}, userId = '', dateStr = '') {
  if (!habit || !userId || !dateStr) return false
  if (habit.startDate && dateStr < habit.startDate) return false
  const userLeaves = asArray(habit.leaves).filter(leave => toId(leave.userId) === toId(userId))
  if (isDateInLeaves(dateStr, userLeaves)) return false
  if (habit.frequency === 'weekly' && asArray(habit.weekdays).length > 0) {
    return habit.weekdays.map(Number).includes(weekdayOf(dateStr))
  }
  return true
}

function isMyTask(habit = {}, currentUserId = '') {
  const isCreator = toId(habit.createdBy) === toId(currentUserId)
  if (!habit.participation || habit.participation === 'both') return true
  if (habit.participation === 'self') return isCreator
  if (habit.participation === 'partner') return !isCreator
  return false
}

export function getDueSubTasks(habit = {}, dateStr = '') {
  const tasks = asArray(habit.subTasks).map((task, index) => ({
    ...task,
    id: toId(task.id || task._id || `${habitId(habit)}-task-${index}`),
    title: task.title || '未命名任务',
    groupTitle: task.groupTitle || task.groupId || '默认组',
    groupId: task.groupId || task.groupTitle || 'default',
    targetValue: Number(task.targetValue) || 0,
    unit: task.unit || '',
    order: Number.isFinite(Number(task.order)) ? Number(task.order) : index
  }))
  if (!tasks.some(task => task.weekday !== undefined && task.weekday !== null)) {
    return tasks.sort((a, b) => a.order - b.order)
  }
  const weekday = weekdayOf(dateStr)
  return tasks.filter(task => Number(task.weekday) === weekday).sort((a, b) => a.order - b.order)
}

function findCheckIn(checkIns, habit, userId, dateStr) {
  const id = habitId(habit)
  return asArray(checkIns).find(checkIn =>
    toId(checkIn.habitId) === id &&
    toId(checkIn.userId) === toId(userId) &&
    checkIn.date === dateStr
  ) || null
}

function buildTaskGroups(tasks, completedIds) {
  const groups = []
  const indexByGroup = new Map()
  const completedSet = new Set(asArray(completedIds).map(toId))

  tasks.forEach(task => {
    const groupKey = task.groupId || task.groupTitle || 'default'
    if (!indexByGroup.has(groupKey)) {
      indexByGroup.set(groupKey, groups.length)
      groups.push({
        id: groupKey,
        title: task.groupTitle || '默认组',
        total: 0,
        completed: 0,
        targetText: '',
        tasks: []
      })
    }
    const group = groups[indexByGroup.get(groupKey)]
    const done = completedSet.has(toId(task.id))
    group.total += 1
    if (done) group.completed += 1
    if (task.targetValue && task.unit && !group.targetText) {
      group.targetText = `${task.targetValue}${task.unit}`
    }
    group.tasks.push({ ...task, done })
  })

  return groups.map(group => ({
    ...group,
    complete: group.total > 0 && group.completed === group.total,
    percent: group.total > 0 ? Math.round(group.completed / group.total * 100) : 0
  }))
}

export function buildPlanExecutionCard(habit = {}, checkIns = [], currentUserId = '', partnerId = '', dateStr = '') {
  const id = habitId(habit)
  const active = isHabitDueForUser(habit, currentUserId, dateStr)
  const mine = findCheckIn(checkIns, habit, currentUserId, dateStr)
  const partner = partnerId ? findCheckIn(checkIns, habit, partnerId, dateStr) : null
  const mineTask = isMyTask(habit, currentUserId)
  const dueSubTasks = habit.type === 'subtasks' ? getDueSubTasks(habit, dateStr) : []
  const completedIds = mine?.completedSubTasks || []
  const completedSet = new Set(completedIds.map(toId))
  const taskGroups = buildTaskGroups(dueSubTasks, completedIds)

  const totalUnits = habit.type === 'subtasks' ? dueSubTasks.length : 1
  const completedUnits = habit.type === 'subtasks'
    ? dueSubTasks.filter(task => completedSet.has(toId(task.id))).length
    : mine ? 1 : 0
  const percent = totalUnits > 0 ? Math.round(completedUnits / totalUnits * 100) : 0
  const completedGroups = taskGroups.filter(group => group.complete).length
  const totalGroups = taskGroups.length

  let state = 'rest'
  if (mineTask && active) {
    if (percent >= 100) state = 'done'
    else if (percent > 0) state = 'partial'
    else state = 'pending'
  }

  const nextTask = taskGroups.flatMap(group => group.tasks).find(task => !task.done) || null
  const actionLabel = state === 'done'
    ? '更新记录'
    : state === 'partial'
      ? '继续完成'
      : active
        ? '开始打卡'
        : '查看详情'

  return {
    id,
    title: habit.title || '未命名计划',
    type: habit.type || 'simple',
    participation: habit.participation || 'both',
    active,
    mineTask,
    state,
    tone: state === 'done' ? 'done' : state === 'partial' ? 'partial' : state === 'pending' ? 'pending' : 'rest',
    completionRate: percent,
    completedUnits,
    totalUnits,
    completedGroups,
    totalGroups,
    taskGroups,
    nextTask,
    actionLabel,
    myChecked: !!mine,
    partnerChecked: !!partner,
    numericValue: mine?.numericValue ?? null,
    summary: habit.type === 'subtasks'
      ? `${completedGroups}/${totalGroups || 0} 组闭环 · ${completedUnits}/${totalUnits} 项`
      : habit.type === 'numeric'
        ? (mine?.numericValue !== undefined && mine?.numericValue !== null ? `已记录 ${mine.numericValue}${habit.numericConfig?.unit || ''}` : `目标 ${habit.numericConfig?.targetValue || 0}${habit.numericConfig?.unit || ''}`)
        : (mine ? '今日已完成' : '今日待打卡')
  }
}

export function buildPlansExecutionDashboard(habits = [], checkIns = [], currentUserId = '', partnerId = '', dateStr = '') {
  const cards = asArray(habits)
    .map(habit => buildPlanExecutionCard(habit, checkIns, currentUserId, partnerId, dateStr))
    .filter(card => card.mineTask)

  const activeCards = cards.filter(card => card.active)
  const pendingCards = activeCards.filter(card => card.state === 'pending')
  const partialCards = activeCards.filter(card => card.state === 'partial')
  const doneCards = activeCards.filter(card => card.state === 'done')
  const totalGroups = activeCards.reduce((sum, card) => sum + card.totalGroups, 0)
  const completedGroups = activeCards.reduce((sum, card) => sum + card.completedGroups, 0)
  const totalUnits = activeCards.reduce((sum, card) => sum + card.totalUnits, 0)
  const completedUnits = activeCards.reduce((sum, card) => sum + card.completedUnits, 0)
  const focus = activeCards.length ? ([...partialCards, ...pendingCards][0] || doneCards[0] || null) : null
  const completionRate = totalUnits ? Math.round(completedUnits / totalUnits * 100) : 0

  return {
    cards,
    activeCards,
    focus,
    total: activeCards.length,
    done: doneCards.length,
    pending: pendingCards.length + partialCards.length,
    partial: partialCards.length,
    completionRate,
    planCompletionRate: activeCards.length ? Math.round(doneCards.length / activeCards.length * 100) : 0,
    totalUnits,
    completedUnits,
    totalGroups,
    completedGroups,
    groupRate: totalGroups ? Math.round(completedGroups / totalGroups * 100) : 0,
    headline: activeCards.length === 0
      ? '今天没有需要打卡的计划'
      : completedUnits === totalUnits
        ? '今日计划已闭环'
        : partialCards.length > 0
          ? `已推进 ${completedUnits}/${totalUnits} 项，继续收尾`
          : `还有 ${pendingCards.length} 个计划要开始`,
    subline: focus
      ? focus.state === 'done'
        ? `${focus.title} 已完成，可以复盘记录。`
        : focus.nextTask
          ? `${focus.title} 下一项：${focus.nextTask.groupTitle} · ${focus.nextTask.title}`
          : `${focus.title} 等待打卡。`
      : '休息日也会保留节奏，不需要硬刷。'
  }
}
