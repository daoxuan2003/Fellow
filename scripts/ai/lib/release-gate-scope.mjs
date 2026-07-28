import path from 'node:path'

const WORK_ITEM_ID_PATTERN = /^(issue|task|incident|release)-[A-Za-z0-9._-]+$/u
const RELEASE_VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u
const BLOCKING_STAGES = new Set(['blocked', 'implementing', 'validating'])
const MAX_SCOPED_WORK_ITEMS = 32

export function parseReleaseWorkItemScope(rawValue) {
  if (rawValue === undefined) {
    return { mode: 'all', ids: [], errors: [], source: 'default' }
  }

  const errors = []
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    errors.push('--work-item requires one or more comma-separated work-item IDs')
    return { mode: 'explicit', ids: [], errors, source: 'argument' }
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

  return { mode: 'explicit', ids, errors, source: 'argument' }
}

export function parseReleaseScopeManifest(manifest, expectedVersion) {
  const errors = []
  const expectedKeys = ['containsSecrets', 'releaseVersion', 'schemaVersion', 'workItemIds']

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { mode: 'explicit', ids: [], errors: ['release scope manifest must be an object'], source: 'manifest' }
  }

  const actualKeys = Object.keys(manifest).sort()
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    errors.push('release scope manifest must contain exactly the approved fields')
  }
  if (manifest.schemaVersion !== 1) errors.push('release scope manifest schemaVersion must be 1')
  if (manifest.containsSecrets !== false) errors.push('release scope manifest containsSecrets must be false')
  if (typeof manifest.releaseVersion !== 'string' || !RELEASE_VERSION_PATTERN.test(manifest.releaseVersion)) {
    errors.push('release scope manifest releaseVersion is invalid')
  } else if (manifest.releaseVersion !== expectedVersion) {
    errors.push('release scope manifest version does not match the application version')
  }

  if (!Array.isArray(manifest.workItemIds) || manifest.workItemIds.length === 0 || manifest.workItemIds.some(id => typeof id !== 'string')) {
    errors.push('release scope manifest workItemIds must be a non-empty string array')
    return { mode: 'explicit', ids: [], errors, source: 'manifest', releaseVersion: manifest.releaseVersion || null }
  }

  const parsed = parseReleaseWorkItemScope(manifest.workItemIds.join(','))
  return {
    mode: 'explicit',
    ids: parsed.ids,
    errors: [...errors, ...parsed.errors],
    source: 'manifest',
    releaseVersion: RELEASE_VERSION_PATTERN.test(manifest.releaseVersion || '') ? manifest.releaseVersion : null
  }
}

export function resolveReleaseScopeFile(rawValue, version, cwd = process.cwd()) {
  const errors = []
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return { resolvedPath: null, relativePath: null, errors: ['--scope-file requires auto or a release-scope JSON path'] }
  }

  let relativePath = rawValue.trim()
  if (relativePath === 'auto') {
    if (typeof version !== 'string' || !RELEASE_VERSION_PATTERN.test(version)) {
      return { resolvedPath: null, relativePath: null, errors: ['application version cannot resolve an automatic release scope'] }
    }
    relativePath = `.ai/releases/${version}.json`
  }

  const scopeRoot = path.resolve(cwd, '.ai/releases')
  const resolvedPath = path.resolve(cwd, relativePath)
  if (!resolvedPath.startsWith(`${scopeRoot}${path.sep}`) || path.extname(resolvedPath).toLowerCase() !== '.json') {
    errors.push('--scope-file must resolve to a JSON file below .ai/releases')
    return { resolvedPath: null, relativePath: null, errors }
  }

  return {
    resolvedPath,
    relativePath: path.relative(cwd, resolvedPath).split(path.sep).join('/'),
    errors
  }
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
      source: scope.source,
      manifestPath: scope.manifestPath || null,
      releaseVersion: scope.releaseVersion || null,
      requestedIds: scope.ids,
      matchedIds,
      excludedCount: files.length - consideredFiles.size,
      ignoredBlockingCount
    },
    scopeErrors,
    blocking
  }
}
