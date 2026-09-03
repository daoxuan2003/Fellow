export const FITNESS_MEAL_STATUS = Object.freeze({
  on_plan: '按计划吃了',
  flexible: '灵活调整',
  missed: '这顿没顾上'
})

export function fitnessExerciseTarget(exercise) {
  if (!exercise || typeof exercise !== 'object') return ''
  if (exercise.tracking === 'reps') {
    return `${exercise.sets}组 × ${exercise.reps}次${exercise.note ? ` · ${exercise.note}` : ''}`
  }
  if (exercise.tracking === 'seconds') {
    return `${exercise.sets}组 × ${exercise.seconds}秒`
  }
  if (exercise.tracking === 'minutes') {
    return `${exercise.minutes}分钟`
  }
  return ''
}

export function fitnessExerciseLogSummary(exercise, log) {
  if (!log?.completed) return '待记录'
  if (exercise?.tracking === 'reps') {
    const reps = Array.isArray(log.actualReps) ? log.actualReps.join(' / ') : ''
    const hasWeight = log.weightKg !== null && log.weightKg !== undefined && log.weightKg !== ''
    const weight = hasWeight && Number.isFinite(Number(log.weightKg)) ? ` · ${Number(log.weightKg)}kg` : ''
    return `${reps || '已完成'}${weight}`
  }
  if (exercise?.tracking === 'seconds') {
    return Array.isArray(log.actualSeconds) && log.actualSeconds.length
      ? `${log.actualSeconds.join(' / ')}秒`
      : '已完成'
  }
  if (exercise?.tracking === 'minutes') {
    return Number.isFinite(Number(log.durationMinutes))
      ? `${Number(log.durationMinutes)}分钟`
      : '已完成'
  }
  return '已完成'
}

export function fitnessProgressPercent(completed, total) {
  const safeCompleted = Math.max(0, Number(completed) || 0)
  const safeTotal = Math.max(0, Number(total) || 0)
  if (!safeTotal) return 0
  return Math.max(0, Math.min(100, Math.round((safeCompleted / safeTotal) * 100)))
}

export function fitnessWeekDayLabel(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString || ''))
  if (!match) return ''
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) return ''
  return ['日', '一', '二', '三', '四', '五', '六'][date.getUTCDay()]
}

export function fitnessDateDay(dateString) {
  const match = /^\d{4}-\d{2}-(\d{2})$/.exec(String(dateString || ''))
  return match ? String(Number(match[1])) : ''
}

export function createExerciseForm(exercise, log = null) {
  const completed = Boolean(log?.completed)
  const hasWeight = log?.weightKg !== null && log?.weightKg !== undefined && log?.weightKg !== ''
  const form = {
    completed: true,
    weightKg: hasWeight && Number.isFinite(Number(log.weightKg)) ? Number(log.weightKg) : '',
    actualReps: [],
    actualSeconds: [],
    durationMinutes: ''
  }
  if (exercise?.tracking === 'reps') {
    form.actualReps = Array.from(
      { length: Number(exercise.sets) || 0 },
      (_, index) => completed && Number(log?.actualReps?.[index]) > 0
        ? Number(log.actualReps[index])
        : Number(exercise.reps)
    )
  }
  if (exercise?.tracking === 'seconds') {
    form.actualSeconds = Array.from(
      { length: Number(exercise.sets) || 0 },
      (_, index) => completed && Number(log?.actualSeconds?.[index]) > 0
        ? Number(log.actualSeconds[index])
        : Number(exercise.seconds)
    )
  }
  if (exercise?.tracking === 'minutes') {
    form.durationMinutes = completed && Number(log?.durationMinutes) > 0
      ? Number(log.durationMinutes)
      : Number(exercise.minutes)
  }
  return form
}
