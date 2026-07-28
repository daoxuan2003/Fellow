export const DATABASE_INSPECTION_REPORT_TYPE = 'fellow-postgraduate-ownership-metrics'

export const DATABASE_INSPECTION_FIELDS = Object.freeze([
  'reportVersion',
  'reportType',
  'generatedAt',
  'containsSecrets',
  'containsRawDocuments',
  'status',
  'metrics',
  'indexes',
  'databaseCapabilities'
])

export const DATABASE_SECTION_STATUSES = Object.freeze([
  'passed',
  'timeout',
  'permission_denied',
  'not_configured',
  'output_limit',
  'failed'
])

export const DATABASE_INDEX_ROLES = Object.freeze([
  'couple_scope',
  'checkin_day',
  'checkin_actor',
  'redacted_other'
])

export const DATABASE_INDEX_DIRECTIONS = Object.freeze([
  'ascending',
  'descending',
  'hashed',
  'text',
  'geo_2d',
  'geo_2dsphere',
  'wildcard',
  'other'
])

const metricFields = Object.freeze([
  'documents',
  'checkInElements',
  'actorPresentElements',
  'actorMissingOrEmptyElements',
  'actorCoveragePercent',
  'duplicateActorDayElementExcess',
  'multiElementCoupleDayCombinations'
])

const topologyCategories = Object.freeze([
  'replica_set',
  'sharded',
  'standalone',
  'unknown'
])

const transactionCategories = Object.freeze([
  'supported',
  'unsupported',
  'unknown'
])

function exactFields(value, expected, label, findings) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    findings.push(`${label} must be an object`)
    return false
  }

  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    findings.push(`${label} has missing or unexpected fields`)
    return false
  }
  return true
}

function isIsoUtc(value) {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) &&
    !Number.isNaN(Date.parse(value))
}

function isCount(value) {
  return Number.isSafeInteger(value) && value >= 0
}

function hasAtMostTwoDecimals(value) {
  return Math.abs((value * 100) - Math.round(value * 100)) < 1e-9
}

function validateMetricSection(section, findings) {
  if (!section || typeof section !== 'object' || Array.isArray(section)) {
    findings.push('metrics must be an object')
    return
  }

  if (!DATABASE_SECTION_STATUSES.includes(section.status)) {
    findings.push('metrics.status has a non-allowlisted category')
    return
  }

  const expectedFields = section.status === 'passed' ? ['status', 'values'] : ['status']
  if (!exactFields(section, expectedFields, 'metrics', findings) || section.status !== 'passed') return
  if (!exactFields(section.values, metricFields, 'metrics.values', findings)) return

  for (const field of metricFields.filter((field) => field !== 'actorCoveragePercent')) {
    if (!isCount(section.values[field])) findings.push(`metrics.values.${field} must be a non-negative safe integer`)
  }

  const coverage = section.values.actorCoveragePercent
  if (
    typeof coverage !== 'number' ||
    !Number.isFinite(coverage) ||
    coverage < 0 ||
    coverage > 100 ||
    !hasAtMostTwoDecimals(coverage)
  ) {
    findings.push('metrics.values.actorCoveragePercent must be a percentage from 0 to 100 with at most two decimals')
  }

  const total = section.values.checkInElements
  const present = section.values.actorPresentElements
  const missing = section.values.actorMissingOrEmptyElements
  if (isCount(total) && isCount(present) && isCount(missing) && present + missing !== total) {
    findings.push('actor present and missing-or-empty counts must equal check-in elements')
  }

  if (isCount(total) && isCount(present) && typeof coverage === 'number') {
    const expectedCoverage = total === 0 ? 0 : Number(((present / total) * 100).toFixed(2))
    if (coverage !== expectedCoverage) findings.push('actor coverage percentage is inconsistent with counts')
  }

  if (
    isCount(total) &&
    isCount(section.values.duplicateActorDayElementExcess) &&
    section.values.duplicateActorDayElementExcess > total
  ) {
    findings.push('duplicate actor/day element excess cannot exceed check-in elements')
  }
  if (
    isCount(total) &&
    isCount(section.values.multiElementCoupleDayCombinations) &&
    section.values.multiElementCoupleDayCombinations > total
  ) {
    findings.push('multi-element couple/day combinations cannot exceed check-in elements')
  }
}

function validateIndexKey(key, findings) {
  if (!exactFields(key, ['role', 'direction'], 'index key', findings)) return
  if (!DATABASE_INDEX_ROLES.includes(key.role)) findings.push('index key role has a non-allowlisted category')
  if (!DATABASE_INDEX_DIRECTIONS.includes(key.direction)) {
    findings.push('index key direction has a non-allowlisted category')
  }
}

function validateIndexShape(index, findings) {
  if (!exactFields(index, ['keys', 'unique', 'sparse'], 'index shape', findings)) return
  if (!Array.isArray(index.keys) || index.keys.length === 0 || index.keys.length > 16) {
    findings.push('index keys must contain 1 to 16 entries')
  } else {
    for (const key of index.keys) validateIndexKey(key, findings)
    if (!index.keys.some((key) => key?.role !== 'redacted_other')) {
      findings.push('related index must include an allowlisted role')
    }
  }
  if (typeof index.unique !== 'boolean') findings.push('index unique must be boolean')
  if (typeof index.sparse !== 'boolean') findings.push('index sparse must be boolean')
}

function validateIndexList(indexes, label, maximum, findings) {
  if (!Array.isArray(indexes) || indexes.length > maximum) {
    findings.push(`${label} must be a bounded array`)
    return
  }
  for (const index of indexes) validateIndexShape(index, findings)
}

function validateIndexSection(section, findings) {
  if (!section || typeof section !== 'object' || Array.isArray(section)) {
    findings.push('indexes must be an object')
    return
  }
  if (!DATABASE_SECTION_STATUSES.includes(section.status)) {
    findings.push('indexes.status has a non-allowlisted category')
    return
  }

  const expectedFields = section.status === 'passed'
    ? ['status', 'declared', 'actual', 'comparison']
    : ['status', 'declared']
  if (!exactFields(section, expectedFields, 'indexes', findings)) return
  validateIndexList(section.declared, 'indexes.declared', 16, findings)
  if (section.status !== 'passed') return

  validateIndexList(section.actual, 'indexes.actual', 32, findings)
  if (!exactFields(
    section.comparison,
    ['matchesDeclared', 'missingDeclaredCount', 'unexpectedActualCount'],
    'indexes.comparison',
    findings
  )) return

  if (typeof section.comparison.matchesDeclared !== 'boolean') {
    findings.push('indexes.comparison.matchesDeclared must be boolean')
  }
  if (!isCount(section.comparison.missingDeclaredCount)) {
    findings.push('indexes.comparison.missingDeclaredCount must be a non-negative safe integer')
  }
  if (!isCount(section.comparison.unexpectedActualCount)) {
    findings.push('indexes.comparison.unexpectedActualCount must be a non-negative safe integer')
  }
  if (
    isCount(section.comparison.missingDeclaredCount) &&
    section.comparison.missingDeclaredCount > section.declared.length
  ) {
    findings.push('missing declared index count cannot exceed declared indexes')
  }
  if (
    isCount(section.comparison.unexpectedActualCount) &&
    section.comparison.unexpectedActualCount > section.actual.length
  ) {
    findings.push('unexpected actual index count cannot exceed actual indexes')
  }

  const matches = section.comparison.missingDeclaredCount === 0 &&
    section.comparison.unexpectedActualCount === 0
  if (section.comparison.matchesDeclared !== matches) {
    findings.push('indexes.comparison.matchesDeclared is inconsistent with counts')
  }
}

function validateCapabilitySection(section, findings) {
  if (!section || typeof section !== 'object' || Array.isArray(section)) {
    findings.push('databaseCapabilities must be an object')
    return
  }
  if (!DATABASE_SECTION_STATUSES.includes(section.status)) {
    findings.push('databaseCapabilities.status has a non-allowlisted category')
    return
  }

  const expectedFields = section.status === 'passed'
    ? ['status', 'topology', 'transactionCapability']
    : ['status']
  if (!exactFields(section, expectedFields, 'databaseCapabilities', findings)) return
  if (section.status !== 'passed') return

  if (!topologyCategories.includes(section.topology)) {
    findings.push('databaseCapabilities.topology has a non-allowlisted category')
  }
  if (!transactionCategories.includes(section.transactionCapability)) {
    findings.push('databaseCapabilities.transactionCapability has a non-allowlisted category')
  }
  if (section.topology === 'unknown' && section.transactionCapability !== 'unknown') {
    findings.push('unknown topology requires unknown transaction capability')
  }
}

function expectedOverallStatus(report) {
  const statuses = [
    report.metrics?.status,
    report.indexes?.status,
    report.databaseCapabilities?.status
  ]
  const passedCount = statuses.filter((status) => status === 'passed').length
  if (passedCount === statuses.length) return 'passed'
  if (passedCount > 0) return 'partial'
  return 'failed'
}

export function isDatabaseInspectionReportCandidate(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) return false
  return report.reportType === DATABASE_INSPECTION_REPORT_TYPE ||
    ['metrics', 'indexes', 'databaseCapabilities'].some((field) => Object.hasOwn(report, field))
}

export function validateDatabaseInspectionReport(report) {
  const findings = []
  if (!exactFields(report, DATABASE_INSPECTION_FIELDS, 'database inspection report', findings)) {
    return findings
  }

  if (report.reportVersion !== 2) findings.push('reportVersion must be 2')
  if (report.reportType !== DATABASE_INSPECTION_REPORT_TYPE) {
    findings.push('reportType has a non-allowlisted category')
  }
  if (!isIsoUtc(report.generatedAt)) findings.push('generatedAt must be an ISO-8601 UTC timestamp')
  if (report.containsSecrets !== false) findings.push('containsSecrets must be false')
  if (report.containsRawDocuments !== false) findings.push('containsRawDocuments must be false')
  if (!['passed', 'partial', 'failed'].includes(report.status)) {
    findings.push('status has a non-allowlisted category')
  }

  validateMetricSection(report.metrics, findings)
  validateIndexSection(report.indexes, findings)
  validateCapabilitySection(report.databaseCapabilities, findings)

  if (report.status !== expectedOverallStatus(report)) {
    findings.push('status is inconsistent with section statuses')
  }
  return findings
}
