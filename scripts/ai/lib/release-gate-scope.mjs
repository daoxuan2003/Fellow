const WORK_ITEM_ID_PATTERN = /^(issue|task|incident|release)-[A-Za-z0-9._-]+$/u
const BLOCKING_STAGES = new Set(['blocked', 'implementing', 'validating'])
const MAX_SCOPED_WORK_ITEMS = 32

export function parseReleaseWorkItemScope(rawValue) {
  if (rawValue === undefined) {
    return { mode: 'all', ids: [], errors: [] }
  }

  const errors = []
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    errors.push('--work-item requires one or more comma-separated work-item IDs')
    return { mode: 'explicit', ids: [], errors }
  }

  const rawIds = rawValue.split(',').map(value => value.trim())
  if (rawIds.some(id => !id)) {
    errors.push('--work-item cannot contain an empty ID')
  }

  const suppliedIds = rawIds.filter(Boolean)
  const ids = suppliedIds.filter(id => WORK_ITEM_ID_PATTERN.test(id))
  const invalidIds = suppliedIds.filter(id => !WORK_ITEM_ID_PATTERN.test(id))
  if (invalidIds.length) {
    errors.push(`--work-item contains ${invalidIds.length} invalid ID(s)`)
  }

  if (new Set(suppliedIds).size !== suppliedIds.length) {
    errors.push('--work-item cannot contain duplicate IDs')
  }

  if (suppliedIds.length > MAX_SCOPED_WORK_ITEMS) {
    errors.push(`--work-item cannot contain more than ${MAX_SCOPED_WORK_ITEMS} IDs`)
  }

  return { mode: 'explicit', ids, errors }
}

export function summarizeReleaseWorkItems(files, scope, readItem) {
  const validRecords = []
  const invalidRecords = []
  const byStage = {}

  for (const file of files) {
    try {
      const item = readItem(file)
      validRecords.push({ file, item })
      byStage[item.stage] = (byStage[item.stage] || 0) + 1
    } catch {
      invalidRecords.push({ id: file, stage: 'invalid', file })
      byStage.invalid = (byStage.invalid || 0) + 1
    }
  }

  const scopeErrors = [...scope.errors]
  let consideredRecords = validRecords
  let consideredInvalid = invalidRecords
  let matchedIds = validRecords.map(record => record.item.id)

  if (scope.mode === 'explicit' && !scopeErrors.length) {
    consideredRecords = []
    consideredInvalid = []
    matchedIds = []

    for (const id of scope.ids) {
      const matches = validRecords.filter(record => record.item.id === id)
      if (matches.length === 0) {
        scopeErrors.push(`release-scoped work item does not exist: ${id}`)
        continue
      }
      if (matches.length > 1) {
        scopeErrors.push(`release-scoped work item ID is duplicated: ${id}`)
        continue
      }
      consideredRecords.push(matches[0])
      matchedIds.push(id)
    }
  }

  const blocking = [
    ...consideredInvalid,
    ...consideredRecords
      .filter(record => BLOCKING_STAGES.has(record.item.stage))
      .map(record => ({ id: record.item.id, stage: record.item.stage, file: record.file }))
  ]

  const consideredFiles = new Set([
    ...consideredRecords.map(record => record.file),
    ...consideredInvalid.map(record => record.file)
  ])
  const ignoredBlockingCount = scope.mode === 'explicit'
    ? validRecords.filter(record => !consideredFiles.has(record.file) && BLOCKING_STAGES.has(record.item.stage)).length + invalidRecords.length
    : 0

  return {
    total: files.length,
    consideredTotal: consideredFiles.size,
    byStage,
    scope: {
      mode: scope.mode,
      requestedIds: scope.ids,
      matchedIds,
      excludedCount: files.length - consideredFiles.size,
      ignoredBlockingCount
    },
    scopeErrors,
    blocking
  }
}
