#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import {
  backendRequire,
  parseArgs
} from './lib/safe-report-utils.mjs'
import {
  DATABASE_INSPECTION_LIMITS,
  classifyMongoCapabilities,
  createUnavailableDatabaseInspectionReport,
  inspectPostgraduateOwnership,
  serializeDatabaseInspectionReport,
  validateInspectionPolicy
} from './lib/database-inspection-core.mjs'

const root = resolve(import.meta.dirname, '../..')
const canonicalPolicyPath = resolve(root, 'scripts/ai/inspection-policy.json')
const args = parseArgs(process.argv.slice(2))

function loadPolicy() {
  const requestedPath = resolve(root, args.policy || 'scripts/ai/inspection-policy.json')
  if (requestedPath !== canonicalPolicyPath || !existsSync(requestedPath)) {
    throw new Error('only the repository inspection policy is accepted')
  }
  const policy = JSON.parse(readFileSync(requestedPath, 'utf8'))
  if (!validateInspectionPolicy(policy)) throw new Error('inspection policy does not match the strict contract')
  return policy
}

function boundedArgument(name, fallback, maximum) {
  if (args[name] === undefined) return fallback
  if (!/^\d+$/u.test(String(args[name]))) throw new Error(`${name} must be an integer`)
  const value = Number(args[name])
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} exceeds the repository policy`)
  }
  return value
}

function classifyFailure(error) {
  const code = String(error?.code || '')
  const name = String(error?.name || '')
  if (code === 'NOT_CONFIGURED') return 'not_configured'
  if (code === 'OUTPUT_LIMIT') return 'output_limit'
  if (['13', '18', 'EACCES', 'EPERM'].includes(code) || /Unauthorized|Permission/iu.test(name)) {
    return 'permission_denied'
  }
  if (['50', 'ETIMEDOUT'].includes(code) || /Timeout|ExceededTimeLimit|ServerSelection/iu.test(name)) {
    return 'timeout'
  }
  return 'failed'
}

function createMongooseAdapter(model, connection) {
  return {
    async aggregate(pipeline, { maxTimeMS }) {
      return model.aggregate(pipeline).option({
        maxTimeMS,
        allowDiskUse: false,
        readPreference: 'secondaryPreferred'
      }).exec()
    },
    async listIndexes({ maxTimeMS }) {
      return model.collection.listIndexes({ maxTimeMS }).toArray()
    },
    async capabilities({ maxTimeMS }) {
      const hello = await connection.db.admin().command({ hello: 1 }, { maxTimeMS })
      return classifyMongoCapabilities(hello)
    }
  }
}

async function disconnectWithin(mongoose, timeoutMS) {
  if (!mongoose?.connection?.readyState) return
  let timer
  try {
    await Promise.race([
      mongoose.disconnect(),
      new Promise((resolvePromise) => {
        timer = setTimeout(resolvePromise, timeoutMS)
      })
    ])
  } catch {
    // Connection details and disconnect errors are intentionally withheld.
  } finally {
    clearTimeout(timer)
  }
}

function writeReport(serialized) {
  if (!args.output) {
    process.stdout.write(serialized)
    return
  }

  const reportsRoot = resolve(root, '.ai-reports')
  const outputPath = resolve(root, args.output)
  const relativePath = relative(reportsRoot, outputPath)
  if (!relativePath || relativePath.startsWith('..') || resolve(reportsRoot, relativePath) !== outputPath) {
    throw new Error('database reports may only be written below .ai-reports')
  }
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, serialized, { encoding: 'utf8', mode: 0o600 })
}

let report
let declaredIndexes = []
let mongoose
let cleanupDeadline = 0
try {
  const policy = loadPolicy()
  const maxTimeMS = boundedArgument('max-time-ms', policy.limits.maxTimeMS, DATABASE_INSPECTION_LIMITS.maxTimeMS)
  const totalTimeoutMS = boundedArgument(
    'total-timeout-ms',
    policy.limits.totalTimeoutMS,
    DATABASE_INSPECTION_LIMITS.totalTimeoutMS
  )

  const requireFromBackend = backendRequire(root)
  mongoose = requireFromBackend('mongoose')
  const model = requireFromBackend(resolve(root, 'backend/models/PostgraduateProgress.js'))
  declaredIndexes = model.schema.indexes()

  const uri = process.env.MONGODB_URI
  if (typeof uri !== 'string' || uri.trim() === '') {
    throw Object.assign(new Error('database connection is not configured'), { code: 'NOT_CONFIGURED' })
  }

  const startedAt = Date.now()
  cleanupDeadline = startedAt + totalTimeoutMS
  const connectionTimeoutMS = Math.min(maxTimeMS, totalTimeoutMS)
  await mongoose.connect(uri, {
    autoCreate: false,
    autoIndex: false,
    connectTimeoutMS: connectionTimeoutMS,
    serverSelectionTimeoutMS: connectionTimeoutMS,
    socketTimeoutMS: connectionTimeoutMS,
    waitQueueTimeoutMS: connectionTimeoutMS,
    maxPoolSize: 1,
    minPoolSize: 0,
    readPreference: 'secondaryPreferred',
    retryReads: false,
    retryWrites: false
  })

  const remainingTimeoutMS = totalTimeoutMS - (Date.now() - startedAt)
  if (remainingTimeoutMS < 1) throw Object.assign(new Error('inspection timeout'), { name: 'TimeoutError' })
  report = await inspectPostgraduateOwnership({
    adapter: createMongooseAdapter(model, mongoose.connection),
    declaredIndexes,
    maxTimeMS: Math.min(maxTimeMS, remainingTimeoutMS),
    totalTimeoutMS: remainingTimeoutMS
  })
} catch (error) {
  report = createUnavailableDatabaseInspectionReport({
    category: classifyFailure(error),
    declaredIndexes
  })
} finally {
  const cleanupBudgetMS = cleanupDeadline
    ? Math.max(1, Math.min(1_000, cleanupDeadline - Date.now()))
    : 1_000
  await disconnectWithin(mongoose, cleanupBudgetMS)
}

let serialized
try {
  serialized = serializeDatabaseInspectionReport(report)
} catch (error) {
  report = createUnavailableDatabaseInspectionReport({
    category: classifyFailure(error),
    declaredIndexes
  })
  serialized = serializeDatabaseInspectionReport(report)
}

try {
  writeReport(serialized)
  process.exitCode = report.status === 'passed' ? 0 : 1
} catch {
  process.stderr.write('Database inspection report output failed safely.\n')
  process.exitCode = 1
}
