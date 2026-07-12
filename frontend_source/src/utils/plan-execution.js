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
    remaining: Math.max(0, group.total - group.completed),
    nextTask: group.tasks.find(task => !task.done) || null,
    complete: group.total > 0 && group.completed === group.total,
    percent: group.total > 0 ? Math.round(group.completed / group.total * 100) : 0,
    statusText: group.total > 0 && group.completed === group.total
      ? '已闭环'
      : `${group.total - group.completed} 项待完成`
  }))
}

function formatTaskTarget(task) {
  if (!task || !task.targetValue || !task.unit) return ''
  return `${task.targetValue}${task.unit}`
}

function formatNextTask(task, group) {
  if (!task) return ''
  const target = formatTaskTarget(task)
  const groupTitle = group?.title && group.title !== '默认组' ? `${group.title} · ` : ''
  return `${groupTitle}${task.title}${target ? ` · ${target}` : ''}`
}

function buildCardGuidance({ habit, state, active, dueSubTasks, taskGroups, nextTask, nextGroup, remainingUnits, remainingGroups, mine }) {
  if (!active) {
    return {
      nextActionTitle: '今天休息',
      nextActionDetail: '这个计划今天不用打卡，节奏保留到下一次。',
      coachPrompt: '休息日不需要硬刷，按计划恢复更重要。',
      feedbackLabel: '休息日',
      feedbackTone: 'rest'
    }
  }

  if (habit.type === 'subtasks') {
    if (dueSubTasks.length === 0) {
      return {
        nextActionTitle: '暂无子任务',
        nextActionDetail: '当前日期没有安排具体子任务。',
        coachPrompt: '可以回到计划里检查每周安排是否完整。',
        feedbackLabel: '无安排',
        feedbackTone: 'rest'
      }
    }
    if (state === 'done') {
      return {
        nextActionTitle: '今天已闭环',
        nextActionDetail: '所有子计划都完成了，可以补一句训练感受。',
        coachPrompt: '今天的执行已经完整，留下笔记会让月底复盘更有用。',
        feedbackLabel: '已闭环',
        feedbackTone: 'done'
      }
    }
    const nextText = formatNextTask(nextTask, nextGroup)
    return {
      nextActionTitle: state === 'partial'
        ? `继续${nextGroup?.title ? ` ${nextGroup.title}` : '收尾'}`
        : `先做${nextGroup?.title ? ` ${nextGroup.title}` : '第一项'}`,
      nextActionDetail: nextText ? `下一项：${nextText}` : '打开清单，从第一项开始。',
      coachPrompt: state === 'partial'
        ? `还差 ${remainingUnits} 项、${remainingGroups} 组未闭环，先把下一项做完。`
        : `今天有 ${taskGroups.length} 组、${dueSubTasks.length} 项，先完成第一组。`,
      feedbackLabel: state === 'partial' ? '推进中' : '待开始',
      feedbackTone: state === 'partial' ? 'partial' : 'pending'
    }
  }

  if (habit.type === 'numeric') {
    const unit = habit.numericConfig?.unit || ''
    const target = habit.numericConfig?.targetValue || 0
    return {
      nextActionTitle: mine ? '更新数值' : '记录数值',
      nextActionDetail: mine?.numericValue !== undefined && mine?.numericValue !== null
        ? `已记录 ${mine.numericValue}${unit}，可以补充今天的状态。`
        : `目标 ${target}${unit}，记录今天的实际值。`,
      coachPrompt: mine ? '今天已有数据，必要时可以更新。' : '把今天的数据记下来，趋势才会可信。',
      feedbackLabel: mine ? '已记录' : '待记录',
      feedbackTone: mine ? 'done' : 'pending'
    }
  }

  return {
    nextActionTitle: mine ? '补充记录' : '完成打卡',
    nextActionDetail: mine ? '今天已经打卡，可以更新心情或笔记。' : '打开后确认今天是否完成。',
    coachPrompt: mine ? '已完成，保留一句复盘会更清楚。' : '先完成一次确认，让今日节奏不断档。',
    feedbackLabel: mine ? '已完成' : '待打卡',
    feedbackTone: mine ? 'done' : 'pending'
  }
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
  const remainingUnits = Math.max(0, totalUnits - completedUnits)
  const remainingGroups = Math.max(0, totalGroups - completedGroups)

  let state = 'rest'
  if (mineTask && active) {
    if (percent >= 100) state = 'done'
    else if (percent > 0) state = 'partial'
    else state = 'pending'
  }

  const nextTask = taskGroups.flatMap(group => group.tasks).find(task => !task.done) || null
  const nextGroup = taskGroups.find(group => group.tasks.some(task => !task.done)) || null
  const actionLabel = state === 'done'
    ? '复盘记录'
    : state === 'partial'
      ? '继续执行'
      : active
        ? '开始执行'
        : '查看详情'
  const guidance = buildCardGuidance({
    habit,
    state,
    active,
    dueSubTasks,
    taskGroups,
    nextTask,
    nextGroup,
    remainingUnits,
    remainingGroups,
    mine
  })

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
    remainingUnits,
    completedGroups,
    totalGroups,
    remainingGroups,
    taskGroups,
    nextTask,
    nextGroup,
    actionLabel,
    ...guidance,
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
  const remainingUnits = Math.max(0, totalUnits - completedUnits)
  const remainingGroups = Math.max(0, totalGroups - completedGroups)
  const nextAction = focus
    ? {
        title: focus.nextActionTitle,
        detail: focus.nextActionDetail,
        label: focus.actionLabel,
        tone: focus.feedbackTone
      }
    : null

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
    remainingUnits,
    totalGroups,
    completedGroups,
    remainingGroups,
    groupRate: totalGroups ? Math.round(completedGroups / totalGroups * 100) : 0,
    nextAction,
    headline: activeCards.length === 0
      ? '今天没有需要打卡的计划'
      : completedUnits === totalUnits
        ? '今日计划已闭环'
        : partialCards.length > 0
          ? `还差 ${remainingUnits} 项，继续收尾`
          : focus
            ? `先完成「${focus.title}」`
            : `还有 ${pendingCards.length} 个计划要开始`,
    subline: focus
      ? focus.coachPrompt
      : '休息日也会保留节奏，不需要硬刷。'
  }
}
