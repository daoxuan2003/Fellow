import {
  DATABASE_INSPECTION_REPORT_TYPE,
  DATABASE_SECTION_STATUSES,
  validateDatabaseInspectionReport
} from './database-inspection-contract.mjs'

export const DATABASE_INSPECTION_LIMITS = Object.freeze({
  maxTimeMS: 5_000,
  totalTimeoutMS: 15_000,
  maxOutputBytes: 16_384,
  maxRawIndexes: 64,
  maxRelevantIndexes: 32
})

export const DATABASE_INSPECTION_POLICY = Object.freeze({
  version: 2,
  inspection: 'postgraduate_ownership',
  model: 'PostgraduateProgress',
  metrics: Object.freeze([
    'documents',
    'checkin_elements',
    'actor_presence',
    'actor_day_duplicate_excess',
    'couple_day_multiple_combinations',
    'relevant_indexes',
    'database_capabilities'
  ]),
  relevantIndexFields: Object.freeze({
    coupleId: 'couple_scope',
    'checkIns.date': 'checkin_day',
    'checkIns.userId': 'checkin_actor'
  }),
  limits: DATABASE_INSPECTION_LIMITS
})

const allowedStages = new Set([
  '$facet',
  '$count',
  '$unwind',
  '$group',
  '$match',
  '$project',
  '$limit'
])

const forbiddenOperators = new Set([
  '$out',
  '$merge',
  '$function',
  '$accumulator',
  '$where',
  '$eval',
  '$mapReduce',
  '$mapreduce',
  'mapReduce',
  'mapreduce',
  'eval'
])

function actorExpression() {
  return {
    $trim: {
      input: {
        $convert: {
          input: '$checkIns.userId',
          to: 'string',
          onError: '',
          onNull: ''
        }
      }
    }
  }
}

export function buildPostgraduateMetricsPipeline() {
  return [
    {
      $facet: {
        documents: [
          { $count: 'value' }
        ],
        elementCoverage: [
          { $match: { checkIns: { $type: 'array' } } },
          { $unwind: '$checkIns' },
          {
            $group: {
              _id: null,
              elements: { $sum: 1 },
              actorPresent: {
                $sum: {
                  $cond: [{ $ne: [actorExpression(), ''] }, 1, 0]
                }
              }
            }
          },
          { $project: { _id: 0, elements: 1, actorPresent: 1 } }
        ],
        actorDayDuplicates: [
          { $match: { checkIns: { $type: 'array' } } },
          { $unwind: '$checkIns' },
          { $match: { $expr: { $ne: [actorExpression(), ''] } } },
          {
            $group: {
              _id: {
                couple: '$coupleId',
                day: '$checkIns.date',
                actor: actorExpression()
              },
              count: { $sum: 1 }
            }
          },
          { $match: { count: { $gt: 1 } } },
          {
            $group: {
              _id: null,
              value: { $sum: { $subtract: ['$count', 1] } }
            }
          },
          { $project: { _id: 0, value: 1 } }
        ],
        coupleDayMultiples: [
          { $match: { checkIns: { $type: 'array' } } },
          { $unwind: '$checkIns' },
          {
            $group: {
              _id: {
                couple: '$coupleId',
                day: '$checkIns.date'
              },
              count: { $sum: 1 }
            }
          },
          { $match: { count: { $gt: 1 } } },
          { $count: 'value' }
        ]
      }
    },
    {
      $project: {
        _id: 0,
        documents: { $ifNull: [{ $arrayElemAt: ['$documents.value', 0] }, 0] },
        checkInElements: { $ifNull: [{ $arrayElemAt: ['$elementCoverage.elements', 0] }, 0] },
        actorPresentElements: { $ifNull: [{ $arrayElemAt: ['$elementCoverage.actorPresent', 0] }, 0] },
        duplicateActorDayElementExcess: {
          $ifNull: [{ $arrayElemAt: ['$actorDayDuplicates.value', 0] }, 0]
        },
        multiElementCoupleDayCombinations: {
          $ifNull: [{ $arrayElemAt: ['$coupleDayMultiples.value', 0] }, 0]
        }
      }
    },
    { $limit: 1 }
  ]
}

function scanForbidden(value) {
  if (Array.isArray(value)) {
    for (const entry of value) scanForbidden(entry)
    return
  }
  if (!value || typeof value !== 'object') return

  for (const [key, entry] of Object.entries(value)) {
    if (forbiddenOperators.has(key)) throw new Error('aggregation contains a forbidden operator')
    scanForbidden(entry)
  }
}

export function assertReadOnlyPipeline(pipeline) {
  if (!Array.isArray(pipeline) || pipeline.length === 0) {
    throw new Error('aggregation pipeline must be a non-empty array')
  }

  for (const stage of pipeline) {
    if (!stage || typeof stage !== 'object' || Array.isArray(stage)) {
      throw new Error('aggregation stage must be an object')
    }
    const keys = Object.keys(stage)
    if (keys.length !== 1 || !allowedStages.has(keys[0])) {
      throw new Error('aggregation contains a non-allowlisted stage')
    }
    if (keys[0] === '$facet') {
      for (const nested of Object.values(stage.$facet || {})) assertReadOnlyPipeline(nested)
    }
    scanForbidden(stage)
  }
  return true
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function validateInspectionPolicy(policy) {
  return stableJson(policy) === stableJson(DATABASE_INSPECTION_POLICY)
}

export function classifyMongoCapabilities(hello) {
  if (!hello || typeof hello !== 'object' || Array.isArray(hello)) {
    return { topology: 'unknown', transactionCapability: 'unknown' }
  }

  const topology = hello.msg === 'isdbgrid'
    ? 'sharded'
    : hello.setName
      ? 'replica_set'
      : 'standalone'
  if (topology === 'standalone') return { topology, transactionCapability: 'unsupported' }

  const sessionsSupported = Number.isFinite(hello.logicalSessionTimeoutMinutes)
  const wireVersion = Number(hello.maxWireVersion)
  if (!sessionsSupported) return { topology, transactionCapability: 'unsupported' }
  if (!Number.isFinite(wireVersion)) return { topology, transactionCapability: 'unknown' }
  const minimumWireVersion = topology === 'sharded' ? 8 : 7
  return {
    topology,
    transactionCapability: wireVersion >= minimumWireVersion ? 'supported' : 'unsupported'
  }
}

function normalizeDirection(direction) {
  if (direction === 1) return 'ascending'
  if (direction === -1) return 'descending'
  if (direction === 'hashed') return 'hashed'
  if (direction === 'text') return 'text'
  if (direction === '2d') return 'geo_2d'
  if (direction === '2dsphere') return 'geo_2dsphere'
  if (direction === '$**') return 'wildcard'
  return 'other'
}

function rawIndexParts(index) {
  if (Array.isArray(index)) return { keys: index[0] || {}, options: index[1] || {} }
  return { keys: index?.key || {}, options: index || {} }
}

function sanitizeRelevantIndex(index) {
  const { keys, options } = rawIndexParts(index)
  const entries = Object.entries(keys)
  if (!entries.some(([path]) => Object.hasOwn(DATABASE_INSPECTION_POLICY.relevantIndexFields, path))) {
    return null
  }
  if (entries.length === 0 || entries.length > 16) {
    throw Object.assign(new Error('index output limit'), { code: 'OUTPUT_LIMIT' })
  }

  return {
    keys: entries.map(([path, direction]) => ({
      role: DATABASE_INSPECTION_POLICY.relevantIndexFields[path] || 'redacted_other',
      direction: normalizeDirection(direction)
    })),
    unique: Boolean(options.unique),
    sparse: Boolean(options.sparse)
  }
}

function indexSignature(index) {
  return JSON.stringify(index)
}

function sanitizeIndexList(indexes, maximumRaw, maximumRelevant) {
  if (!Array.isArray(indexes) || indexes.length > maximumRaw) {
    throw Object.assign(new Error('index output limit'), { code: 'OUTPUT_LIMIT' })
  }
  const relevant = indexes.map(sanitizeRelevantIndex).filter(Boolean)
  if (relevant.length > maximumRelevant) {
    throw Object.assign(new Error('index output limit'), { code: 'OUTPUT_LIMIT' })
  }
  return relevant.sort((left, right) => indexSignature(left).localeCompare(indexSignature(right)))
}

function multisetDifferenceCount(left, right) {
  const remaining = new Map()
  for (const entry of right) {
    const signature = indexSignature(entry)
    remaining.set(signature, (remaining.get(signature) || 0) + 1)
  }

  let missing = 0
  for (const entry of left) {
    const signature = indexSignature(entry)
    const count = remaining.get(signature) || 0
    if (count === 0) missing += 1
    else remaining.set(signature, count - 1)
  }
  return missing
}

function classifyInspectionError(error) {
  if (DATABASE_SECTION_STATUSES.includes(error?.category) && error.category !== 'passed') return error.category
  const code = String(error?.code || '')
  const name = String(error?.name || '')
  if (code === 'NOT_CONFIGURED') return 'not_configured'
  if (code === 'OUTPUT_LIMIT') return 'output_limit'
  if (['13', '18', 'EACCES', 'EPERM'].includes(code) || /Unauthorized|Permission/iu.test(name)) {
    return 'permission_denied'
  }
  if (['50', 'ETIMEDOUT'].includes(code) || /Timeout|ExceededTimeLimit/iu.test(name)) return 'timeout'
  return 'failed'
}

function timeoutError() {
  return Object.assign(new Error('inspection timeout'), { category: 'timeout' })
}

async function withDeadline(operation, deadline, maxTimeMS) {
  const remaining = deadline - Date.now()
  if (remaining <= 0) throw timeoutError()
  const commandMaxTimeMS = Math.max(1, Math.min(maxTimeMS, remaining))
  let timer
  try {
    return await Promise.race([
      operation(commandMaxTimeMS),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(timeoutError()), remaining)
      })
    ])
  } finally {
    clearTimeout(timer)
  }
}

function ensureSafeCount(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('invalid aggregate result')
  return value
}

function normalizeMetrics(result) {
  if (!Array.isArray(result) || result.length !== 1) throw new Error('invalid aggregate result')
  const row = result[0]
  const expected = [
    'documents',
    'checkInElements',
    'actorPresentElements',
    'duplicateActorDayElementExcess',
    'multiElementCoupleDayCombinations'
  ].sort()
  if (!row || typeof row !== 'object' || Array.isArray(row) ||
    JSON.stringify(Object.keys(row).sort()) !== JSON.stringify(expected)) {
    throw new Error('invalid aggregate result')
  }

  const documents = ensureSafeCount(row.documents)
  const checkInElements = ensureSafeCount(row.checkInElements)
  const actorPresentElements = ensureSafeCount(row.actorPresentElements)
  const duplicateActorDayElementExcess = ensureSafeCount(row.duplicateActorDayElementExcess)
  const multiElementCoupleDayCombinations = ensureSafeCount(row.multiElementCoupleDayCombinations)
  if (actorPresentElements > checkInElements || duplicateActorDayElementExcess > checkInElements) {
    throw new Error('invalid aggregate result')
  }

  return {
    documents,
    checkInElements,
    actorPresentElements,
    actorMissingOrEmptyElements: checkInElements - actorPresentElements,
    actorCoveragePercent: checkInElements === 0
      ? 0
      : Number(((actorPresentElements / checkInElements) * 100).toFixed(2)),
    duplicateActorDayElementExcess,
    multiElementCoupleDayCombinations
  }
}

function overallStatus(sections) {
  const passedCount = sections.filter((section) => section.status === 'passed').length
  if (passedCount === sections.length) return 'passed'
  if (passedCount > 0) return 'partial'
  return 'failed'
}

function baseReport(now) {
  return {
    reportVersion: 2,
    reportType: DATABASE_INSPECTION_REPORT_TYPE,
    generatedAt: now.toISOString(),
    containsSecrets: false,
    containsRawDocuments: false,
    status: 'failed',
    metrics: { status: 'failed' },
    indexes: { status: 'failed', declared: [] },
    databaseCapabilities: { status: 'failed' }
  }
}

function declaredIndexShapes(declaredIndexes) {
  return sanitizeIndexList(declaredIndexes, 16, 16)
}

export function createUnavailableDatabaseInspectionReport({
  category,
  declaredIndexes = [],
  now = new Date()
}) {
  const safeCategory = DATABASE_SECTION_STATUSES.includes(category) && category !== 'passed'
    ? category
    : 'failed'
  let declared = []
  try {
    declared = declaredIndexShapes(declaredIndexes)
  } catch {
    // Repository-declared index parsing failure is represented by the section status only.
  }
  const report = baseReport(now)
  report.metrics = { status: safeCategory }
  report.indexes = { status: safeCategory, declared }
  report.databaseCapabilities = { status: safeCategory }
  return report
}

export async function inspectPostgraduateOwnership({
  adapter,
  declaredIndexes = [],
  now = new Date(),
  maxTimeMS = DATABASE_INSPECTION_LIMITS.maxTimeMS,
  totalTimeoutMS = DATABASE_INSPECTION_LIMITS.totalTimeoutMS
}) {
  if (!adapter || typeof adapter.aggregate !== 'function' ||
    typeof adapter.listIndexes !== 'function' || typeof adapter.capabilities !== 'function') {
    throw new TypeError('database inspection adapter is incomplete')
  }
  if (!Number.isInteger(maxTimeMS) || maxTimeMS < 1 || maxTimeMS > DATABASE_INSPECTION_LIMITS.maxTimeMS) {
    throw new RangeError('maxTimeMS exceeds the repository policy')
  }
  if (
    !Number.isInteger(totalTimeoutMS) ||
    totalTimeoutMS < 1 ||
    totalTimeoutMS > DATABASE_INSPECTION_LIMITS.totalTimeoutMS
  ) {
    throw new RangeError('totalTimeoutMS exceeds the repository policy')
  }

  const report = baseReport(now)
  const deadline = Date.now() + totalTimeoutMS
  let declared = []
  let declaredFailure = null
  try {
    declared = declaredIndexShapes(declaredIndexes)
  } catch (error) {
    declaredFailure = classifyInspectionError(error)
    report.indexes = { status: declaredFailure, declared: [] }
  }

  try {
    const pipeline = buildPostgraduateMetricsPipeline()
    assertReadOnlyPipeline(pipeline)
    const result = await withDeadline(
      (commandMaxTimeMS) => adapter.aggregate(pipeline, { maxTimeMS: commandMaxTimeMS }),
      deadline,
      maxTimeMS
    )
    report.metrics = { status: 'passed', values: normalizeMetrics(result) }
  } catch (error) {
    report.metrics = { status: classifyInspectionError(error) }
  }

  if (declaredFailure) {
    // Preserve the repository parsing failure without querying actual index metadata.
  } else {
    try {
      const rawActual = await withDeadline(
        (commandMaxTimeMS) => adapter.listIndexes({ maxTimeMS: commandMaxTimeMS }),
        deadline,
        maxTimeMS
      )
      const actual = sanitizeIndexList(
        rawActual,
        DATABASE_INSPECTION_LIMITS.maxRawIndexes,
        DATABASE_INSPECTION_LIMITS.maxRelevantIndexes
      )
      const missingDeclaredCount = multisetDifferenceCount(declared, actual)
      const unexpectedActualCount = multisetDifferenceCount(actual, declared)
      report.indexes = {
        status: 'passed',
        declared,
        actual,
        comparison: {
          matchesDeclared: missingDeclaredCount === 0 && unexpectedActualCount === 0,
          missingDeclaredCount,
          unexpectedActualCount
        }
      }
    } catch (error) {
      report.indexes = { status: classifyInspectionError(error), declared }
    }
  }

  try {
    const capabilities = await withDeadline(
      (commandMaxTimeMS) => adapter.capabilities({ maxTimeMS: commandMaxTimeMS }),
      deadline,
      maxTimeMS
    )
    const topology = capabilities?.topology
    const transactionCapability = capabilities?.transactionCapability
    if (!['replica_set', 'sharded', 'standalone', 'unknown'].includes(topology) ||
      !['supported', 'unsupported', 'unknown'].includes(transactionCapability) ||
      (topology === 'unknown' && transactionCapability !== 'unknown')) {
      throw new Error('invalid capability result')
    }
    report.databaseCapabilities = { status: 'passed', topology, transactionCapability }
  } catch (error) {
    report.databaseCapabilities = { status: classifyInspectionError(error) }
  }

  report.status = overallStatus([report.metrics, report.indexes, report.databaseCapabilities])
  const findings = validateDatabaseInspectionReport(report)
  if (findings.length) throw new Error('database inspection report failed its strict contract')
  return report
}

export function serializeDatabaseInspectionReport(
  report,
  { maxBytes = DATABASE_INSPECTION_LIMITS.maxOutputBytes } = {}
) {
  const findings = validateDatabaseInspectionReport(report)
  if (findings.length) throw new Error('database inspection report failed its strict contract')
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > DATABASE_INSPECTION_LIMITS.maxOutputBytes) {
    throw new RangeError('maxBytes exceeds the repository policy')
  }

  const serialized = `${JSON.stringify(report, null, 2)}\n`
  if (Buffer.byteLength(serialized, 'utf8') > maxBytes) {
    throw Object.assign(new Error('database inspection report exceeds output limit'), { code: 'OUTPUT_LIMIT' })
  }
  return serialized
}

function syntheticError(category) {
  return Object.assign(new Error('synthetic database outcome'), { category })
}

function actorValue(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function syntheticAggregate(documents) {
  const actorDayCounts = new Map()
  const coupleDayCounts = new Map()
  let checkInElements = 0
  let actorPresentElements = 0

  for (const document of documents) {
    const checkIns = Array.isArray(document?.checkIns) ? document.checkIns : []
    for (const checkIn of checkIns) {
      checkInElements += 1
      const actor = actorValue(checkIn?.userId)
      const coupleDay = JSON.stringify([document?.coupleId ?? null, checkIn?.date ?? null])
      coupleDayCounts.set(coupleDay, (coupleDayCounts.get(coupleDay) || 0) + 1)
      if (!actor) continue

      actorPresentElements += 1
      const actorDay = JSON.stringify([document?.coupleId ?? null, checkIn?.date ?? null, actor])
      actorDayCounts.set(actorDay, (actorDayCounts.get(actorDay) || 0) + 1)
    }
  }

  let duplicateActorDayElementExcess = 0
  for (const count of actorDayCounts.values()) duplicateActorDayElementExcess += Math.max(0, count - 1)
  let multiElementCoupleDayCombinations = 0
  for (const count of coupleDayCounts.values()) {
    if (count > 1) multiElementCoupleDayCombinations += 1
  }

  return [{
    documents: documents.length,
    checkInElements,
    actorPresentElements,
    duplicateActorDayElementExcess,
    multiElementCoupleDayCombinations
  }]
}

export function createDatabaseInspectionFixtureAdapter(fixture) {
  const fail = () => {
    if (fixture?.outcome) throw syntheticError(fixture.outcome)
  }
  return {
    async aggregate(pipeline) {
      fail()
      assertReadOnlyPipeline(pipeline)
      return syntheticAggregate(Array.isArray(fixture?.documents) ? fixture.documents : [])
    },
    async listIndexes() {
      fail()
      return fixture?.actualIndexes || []
    },
    async capabilities() {
      fail()
      return {
        topology: fixture?.topology || 'unknown',
        transactionCapability: fixture?.transactionCapability || 'unknown'
      }
    }
  }
}
