#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  backendRequire,
  classifyError,
  loadBackendEnvironment,
  parseArgs,
  percentage,
  writeJsonReport
} from './lib/safe-report-utils.mjs'

const root = resolve(import.meta.dirname, '../..')
const args = parseArgs(process.argv.slice(2))
loadBackendEnvironment(root)

function loadPolicy() {
  const policyPath = resolve(root, args.policy || 'scripts/ai/inspection-policy.json')
  if (!existsSync(policyPath)) return { version: 1, models: {} }
  return JSON.parse(readFileSync(policyPath, 'utf8'))
}

function indexSignature(keys) {
  return Object.entries(keys || {})
    .map(([path, direction]) => `${path}:${String(direction)}`)
    .join('|')
}

function safeIndex(index) {
  return {
    name: index.name || null,
    keys: index.key || index[0] || {},
    unique: Boolean(index.unique || index[1]?.unique),
    sparse: Boolean(index.sparse || index[1]?.sparse)
  }
}

async function fieldPresence(model, path, label) {
  const result = await model.aggregate([
    {
      $group: {
        _id: null,
        totalDocuments: { $sum: 1 },
        documentsWithField: {
          $sum: {
            $cond: [{ $ne: [{ $type: `$${path}` }, 'missing'] }, 1, 0]
          }
        }
      }
    }
  ])

  const metric = result[0] || { totalDocuments: 0, documentsWithField: 0 }
  return {
    label,
    path,
    totalDocuments: metric.totalDocuments,
    documentsWithField: metric.documentsWithField,
    coveragePercent: percentage(metric.documentsWithField, metric.totalDocuments)
  }
}

async function arrayElementPresence(model, arrayPath, fieldPath, label) {
  const result = await model.aggregate([
    { $match: { [arrayPath]: { $type: 'array' } } },
    { $unwind: `$${arrayPath}` },
    {
      $group: {
        _id: null,
        totalElements: { $sum: 1 },
        elementsWithField: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: [{ $type: `$${arrayPath}.${fieldPath}` }, 'missing'] },
                  { $ne: [{ $toString: { $ifNull: [`$${arrayPath}.${fieldPath}`, ''] } }, ''] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ])

  const metric = result[0] || { totalElements: 0, elementsWithField: 0 }
  return {
    label,
    arrayPath,
    fieldPath,
    totalElements: metric.totalElements,
    elementsWithField: metric.elementsWithField,
    legacyOrMissingElements: metric.totalElements - metric.elementsWithField,
    coveragePercent: percentage(metric.elementsWithField, metric.totalElements)
  }
}

async function duplicateCheck(model, paths, label, ignoreMissing) {
  const match = {}
  if (ignoreMissing) {
    for (const path of paths) match[path] = { $exists: true, $nin: [null, ''] }
  }

  const identifier = Object.fromEntries(paths.map((path) => [path, `$${path}`]))
  const pipeline = []
  if (Object.keys(match).length) pipeline.push({ $match: match })
  pipeline.push(
    { $group: { _id: identifier, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    {
      $group: {
        _id: null,
        duplicateGroups: { $sum: 1 },
        duplicateDocumentExcess: { $sum: { $subtract: ['$count', 1] } }
      }
    }
  )

  const result = await model.aggregate(pipeline)
  return {
    label,
    paths,
    duplicateGroups: result[0]?.duplicateGroups || 0,
    duplicateDocumentExcess: result[0]?.duplicateDocumentExcess || 0
  }
}

async function inspectModel(model, policy) {
  const declared = model.schema.indexes().map(safeIndex)
  let actual = []
  try {
    actual = (await model.collection.indexes()).map(safeIndex)
  } catch {
    // A collection may not exist yet. That is reported without leaking server details.
  }

  const actualSignatures = new Set(actual.map((index) => indexSignature(index.keys)))
  const fieldMetrics = []
  const arrayMetrics = []
  const duplicateMetrics = []

  for (const entry of policy.fieldPresence || []) {
    fieldMetrics.push(await fieldPresence(model, entry.path, entry.label || entry.path))
  }
  for (const entry of policy.arrayElementPresence || []) {
    arrayMetrics.push(await arrayElementPresence(
      model,
      entry.arrayPath,
      entry.fieldPath,
      entry.label || `${entry.arrayPath}.${entry.fieldPath}`
    ))
  }
  for (const entry of policy.duplicateChecks || []) {
    duplicateMetrics.push(await duplicateCheck(
      model,
      entry.paths,
      entry.label || entry.paths.join('+'),
      entry.ignoreMissing !== false
    ))
  }

  return {
    model: model.modelName,
    collection: model.collection.collectionName,
    estimatedDocuments: await model.estimatedDocumentCount(),
    indexes: {
      declared,
      actual,
      missingDeclared: declared.filter((index) => !actualSignatures.has(indexSignature(index.keys)))
    },
    fieldMetrics,
    arrayMetrics,
    duplicateMetrics
  }
}

const report = {
  reportVersion: 1,
  reportType: 'fellow-database-inspection',
  generatedAt: new Date().toISOString(),
  containsSecrets: false,
  containsRawDocuments: false,
  status: 'not-run',
  topology: 'unknown',
  transactionsSupported: false,
  models: [],
  policy: { version: null, configuredModels: [] },
  limitations: [
    'Counts and aggregations describe the database at one point in time.',
    'No names, messages, health values, photos, notes, tokens, pair codes or raw documents are emitted.',
    'A clean report does not replace backup and restore testing.'
  ]
}

let mongoose
try {
  if (!process.env.MONGODB_URI) throw Object.assign(new Error('missing'), { code: 'NOT_CONFIGURED' })

  const requireFromBackend = backendRequire(root)
  mongoose = requireFromBackend('mongoose')
  requireFromBackend(resolve(root, 'backend/models/index.js'))

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: Number(args.timeout || 8000),
    connectTimeoutMS: Number(args.timeout || 8000),
    maxPoolSize: 1
  })

  const hello = await mongoose.connection.db.admin().command({ hello: 1 })
  const isSharded = hello?.msg === 'isdbgrid'
  const isReplicaSet = Boolean(hello?.setName)
  const sessionsSupported = Number.isFinite(hello?.logicalSessionTimeoutMinutes)
  report.topology = isSharded ? 'sharded' : isReplicaSet ? 'replica-set' : 'standalone'
  report.transactionsSupported = sessionsSupported && (isSharded || isReplicaSet)

  const policy = loadPolicy()
  report.policy = {
    version: policy.version || null,
    configuredModels: Object.keys(policy.models || {}).sort()
  }

  for (const modelName of Object.keys(mongoose.models).sort()) {
    const model = mongoose.models[modelName]
    report.models.push(await inspectModel(model, policy.models?.[modelName] || {}))
  }

  report.status = 'passed'
} catch (error) {
  report.status = process.env.MONGODB_URI ? 'failed' : 'not-configured'
  report.failureCategory = error?.code === 'NOT_CONFIGURED'
    ? 'database-not-configured'
    : classifyError(error)
} finally {
  if (mongoose?.connection?.readyState) {
    try {
      await mongoose.disconnect()
    } catch {
      // Deliberately suppress connection details.
    }
  }
}

writeJsonReport(report, args.output, root)
process.exitCode = report.status === 'passed' ? 0 : 1
