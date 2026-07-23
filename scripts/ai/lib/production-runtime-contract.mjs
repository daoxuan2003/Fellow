export const PRODUCTION_RUNTIME_FIELDS = Object.freeze([
  'generatedAt',
  'nodeVersionCategory',
  'npmAvailable',
  'applicationDirectoryPresent',
  'httpHealth',
  'websocketHealth',
  'port3000Listening',
  'port3001Listening',
  'rootDiskUsagePercent',
  'defaultBackupDirectoryPresent',
  'latestDefaultBackupAgeCategory',
  'latestDefaultBackupSizeCategory',
  'pm2Status',
  'nginxStatus',
  'unsupportedChecks'
])

export const PERMANENT_UNSUPPORTED_CHECKS = Object.freeze([
  'backupIntegrity',
  'deployedCommit',
  'nginxRouting',
  'restoreDrill',
  'storageReachability',
  'tlsCertificate'
])

const exceptionalCategories = Object.freeze([
  'permission_denied',
  'timeout',
  'unsupported'
])

const allowedUnsupportedChecks = new Set([
  ...PERMANENT_UNSUPPORTED_CHECKS,
  ...PRODUCTION_RUNTIME_FIELDS.filter((field) => !['generatedAt', 'unsupportedChecks'].includes(field))
])

const fieldCategories = Object.freeze({
  nodeVersionCategory: ['supported', 'unsupported', 'unknown'],
  httpHealth: ['pass', 'fail', ...exceptionalCategories],
  websocketHealth: ['pass', 'fail', ...exceptionalCategories],
  latestDefaultBackupAgeCategory: [
    'fresh',
    'aging',
    'stale',
    'missing',
    ...exceptionalCategories
  ],
  latestDefaultBackupSizeCategory: [
    'empty',
    'small',
    'medium',
    'large',
    'missing',
    ...exceptionalCategories
  ],
  pm2Status: ['healthy', 'degraded', 'missing', ...exceptionalCategories],
  nginxStatus: ['active', 'inactive', 'missing', ...exceptionalCategories]
})

const presenceFields = Object.freeze([
  'npmAvailable',
  'applicationDirectoryPresent',
  'port3000Listening',
  'port3001Listening',
  'defaultBackupDirectoryPresent'
])

export function exceptionalCategory(outcome) {
  return exceptionalCategories.includes(outcome) ? outcome : null
}

export function buildUnsupportedChecks(dynamicChecks = []) {
  return [...new Set([
    ...PERMANENT_UNSUPPORTED_CHECKS,
    ...dynamicChecks.filter((check) => allowedUnsupportedChecks.has(check))
  ])].sort()
}

export function isProductionRuntimeReportCandidate(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) return false
  return PRODUCTION_RUNTIME_FIELDS
    .filter((field) => field !== 'generatedAt')
    .some((field) => Object.hasOwn(report, field))
}

export function validateProductionRuntimeReport(report) {
  const findings = []

  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return ['production runtime report must be an object']
  }

  const actualFields = Object.keys(report).sort()
  const expectedFields = [...PRODUCTION_RUNTIME_FIELDS].sort()
  const missingFields = expectedFields.filter((field) => !Object.hasOwn(report, field))
  const extraFields = actualFields.filter((field) => !expectedFields.includes(field))

  if (missingFields.length) findings.push(`missing fields: ${missingFields.join(', ')}`)
  if (extraFields.length) findings.push(`unexpected fields: ${extraFields.join(', ')}`)

  if (
    typeof report.generatedAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(report.generatedAt) ||
    Number.isNaN(Date.parse(report.generatedAt))
  ) {
    findings.push('generatedAt must be an ISO-8601 UTC timestamp')
  }

  for (const field of presenceFields) {
    const value = report[field]
    if (typeof value !== 'boolean' && !exceptionalCategories.includes(value)) {
      findings.push(`${field} must be boolean or an exceptional category`)
    }
  }

  for (const [field, categories] of Object.entries(fieldCategories)) {
    if (!categories.includes(report[field])) {
      findings.push(`${field} has a non-allowlisted category`)
    }
  }

  const diskUsage = report.rootDiskUsagePercent
  if (
    !(Number.isInteger(diskUsage) && diskUsage >= 0 && diskUsage <= 100) &&
    !exceptionalCategories.includes(diskUsage)
  ) {
    findings.push('rootDiskUsagePercent must be an integer from 0 to 100 or an exceptional category')
  }

  if (!Array.isArray(report.unsupportedChecks)) {
    findings.push('unsupportedChecks must be an array')
  } else {
    const unique = new Set(report.unsupportedChecks)
    if (unique.size !== report.unsupportedChecks.length) {
      findings.push('unsupportedChecks must not contain duplicates')
    }
    if (report.unsupportedChecks.some((check) => !allowedUnsupportedChecks.has(check))) {
      findings.push('unsupportedChecks contains a non-allowlisted check')
    }
    const sorted = [...report.unsupportedChecks].sort()
    if (JSON.stringify(sorted) !== JSON.stringify(report.unsupportedChecks)) {
      findings.push('unsupportedChecks must be sorted')
    }
    for (const check of PERMANENT_UNSUPPORTED_CHECKS) {
      if (!unique.has(check)) findings.push(`unsupportedChecks must include ${check}`)
    }
  }

  return findings
}
