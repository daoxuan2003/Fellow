export const DAILY_TASK_LIMIT = 12
export const DAILY_TASK_TEXT_LIMIT = 80

export function getCalendarDateString(date = new Date(), timeZone = 'Asia/Shanghai') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const values = Object.fromEntries(
    parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value])
  )
  return `${values.year}-${values.month}-${values.day}`
}

export function validateDailyTaskDraft(value) {
  const lines = String(value || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
  const items = [...new Set(lines)]

  if (items.length === 0) {
    return { valid: false, items: [], count: 0, error: '先写下一项准备完成的任务' }
  }
  if (items.length > DAILY_TASK_LIMIT) {
    return {
      valid: false,
      items,
      count: items.length,
      error: `一次最多写 ${DAILY_TASK_LIMIT} 项，请分两次添加`
    }
  }
  if (items.some(item => item.length > DAILY_TASK_TEXT_LIMIT)) {
    return {
      valid: false,
      items,
      count: items.length,
      error: `每项最多 ${DAILY_TASK_TEXT_LIMIT} 个字，请把长任务拆开`
    }
  }

  return { valid: true, items, count: items.length, error: '' }
}

export function normalizeDailyTaskDay(source = {}, { readOnly = false } = {}) {
  const tasks = Array.isArray(source.tasks) ? source.tasks : []
  const completed = tasks.filter(task => task?.completed).length
  return {
    date: String(source.date || ''),
    readOnly: Boolean(source.readOnly ?? readOnly),
    total: tasks.length,
    completed,
    tasks
  }
}

export function normalizeDailyTaskBoard(source = {}) {
  return {
    today: normalizeDailyTaskDay(source.today),
    yesterday: normalizeDailyTaskDay(source.yesterday, { readOnly: true })
  }
}

export function buildDailyEncouragement(yesterday = {}) {
  const total = Math.max(0, Number(yesterday.total) || 0)
  const completed = Math.max(0, Math.min(total, Number(yesterday.completed) || 0))

  if (total === 0) {
    return {
      tone: 'neutral',
      title: '今天从第一件小事开始',
      detail: '昨天没有留下任务，今天写下真正准备完成的事。'
    }
  }
  if (completed === 0) {
    return {
      tone: 'restart',
      title: '今天重新开一页',
      detail: `昨天的 ${total} 项还没划掉也没关系，先写下今天最重要的一项。`
    }
  }
  if (completed === total) {
    return {
      tone: 'complete',
      title: `昨天 ${completed} 项全部完成`,
      detail: '答应自己的事都做到了，今天继续按真实节奏往前走。'
    }
  }
  if (completed === 1) {
    return {
      tone: 'progress',
      title: '昨天完成 1 项',
      detail: '一件也算实打实的推进，今天继续抓住最重要的任务。'
    }
  }
  if (completed <= 3) {
    return {
      tone: 'progress',
      title: `昨天完成 ${completed} 项`,
      detail: '节奏已经起来了，今天把这股劲接着用下去。'
    }
  }
  return {
    tone: 'strong',
    title: `昨天完成 ${completed} 项`,
    detail: '昨天推进得很扎实，今天依然按自己的节奏稳稳完成。'
  }
}
