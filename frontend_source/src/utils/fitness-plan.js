export const FITNESS_MEAL_STATUS = Object.freeze({
  on_plan: '按计划吃了',
  flexible: '灵活调整',
  missed: '这顿没顾上'
})

function recordedNumber(value) {
  if (value === null || value === undefined || typeof value === 'boolean') return null
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && !value.trim()) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

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
    const reps = Array.isArray(log.actualReps) && log.actualReps.length
      ? `${log.actualReps.map(value => recordedNumber(value) ?? '—').join(' / ')}次`
      : '实际次数未记录'
    const weight = recordedNumber(log.weightKg) !== null ? ` · ${fitnessExerciseWeight(log)}` : ''
    return `${reps}${weight}`
  }
  if (exercise?.tracking === 'seconds') {
    return Array.isArray(log.actualSeconds) && log.actualSeconds.length
      ? `${log.actualSeconds.map(value => recordedNumber(value) ?? '—').join(' / ')}秒`
      : '实际秒数未记录'
  }
  if (exercise?.tracking === 'minutes') {
    const minutes = recordedNumber(log.durationMinutes)
    return minutes !== null ? `${minutes}分钟` : '实际时长未记录'
  }
  return '已记录'
}

export function fitnessExerciseWeight(log) {
  const weight = recordedNumber(log?.weightKg)
  return weight === null ? '未记录重量' : `${weight} kg`
}

export function fitnessExerciseAssessment(exercise, log) {
  const recorded = Boolean(log?.completed)
  const tracking = exercise?.tracking
  const isSetTracking = tracking === 'reps' || tracking === 'seconds'
  const sets = recordedNumber(exercise?.sets)
  const totalSets = isSetTracking && Number.isInteger(sets) ? sets : tracking === 'minutes' ? 1 : 0
  const result = { recorded, metTarget: false, metSets: 0, totalSets, label: '待记录', detail: fitnessExerciseTarget(exercise) }
  if (!recorded) return result

  result.label = '未达目标'
  if (isSetTracking) {
    const target = recordedNumber(exercise[tracking])
    const values = tracking === 'reps' ? log.actualReps : log.actualSeconds
    const actual = Array.isArray(values) ? values : []
    const unit = tracking === 'reps' ? '次' : '秒'
    if (target !== null && totalSets > 0) {
      result.metSets = Array.from({ length: totalSets }, (_, index) => recordedNumber(actual?.[index]))
        .filter(value => value !== null && value >= target).length
      result.metTarget = result.metSets === totalSets
      result.detail = `${result.metSets}/${totalSets}组达到${target}${unit}`
    } else {
      result.detail = '训练目标待补全'
    }
  } else if (tracking === 'minutes') {
    const actual = recordedNumber(log.durationMinutes)
    const target = recordedNumber(exercise.minutes)
    result.metTarget = actual !== null && target !== null && actual >= target
    result.metSets = result.metTarget ? 1 : 0
    result.detail = `实际${actual === null ? '未记录' : `${actual}分钟`} / 目标${target === null ? '待补全' : `${target}分钟`}`
  } else {
    result.detail = '训练目标待补全'
  }
  if (result.metTarget) result.label = '已达目标'
  return result
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

export function createExerciseForm(exercise, log = null, previousLog = null) {
  const recorded = Boolean(log?.completed)
  const weightSource = log ?? previousLog
  const form = {
    completed: true,
    weightKg: recordedNumber(weightSource?.weightKg) ?? '',
    actualReps: [],
    actualSeconds: [],
    durationMinutes: ''
  }
  if (exercise?.tracking === 'reps') {
    form.actualReps = Array.from(
      { length: Number(exercise.sets) || 0 },
      (_, index) => recorded ? recordedNumber(log?.actualReps?.[index]) ?? '' : ''
    )
  }
  if (exercise?.tracking === 'seconds') {
    form.actualSeconds = Array.from(
      { length: Number(exercise.sets) || 0 },
      (_, index) => recorded ? recordedNumber(log?.actualSeconds?.[index]) ?? '' : ''
    )
  }
  if (exercise?.tracking === 'minutes') {
    form.durationMinutes = recorded ? recordedNumber(log?.durationMinutes) ?? '' : ''
  }
  return form
}
