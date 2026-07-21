#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  backendRequire,
  classifyError,
  classifyMongoScheme,
  configured,
  configuredAll,
  countConfiguredCsv,
  loadBackendEnvironment,
  parseArgs,
  readDeclaredEnvKeys,
  writeJsonReport
} from './lib/safe-report-utils.mjs'

const root = resolve(import.meta.dirname, '../..')
const args = parseArgs(process.argv.slice(2))
const environmentLoad = loadBackendEnvironment(root)
const probeRequested = args.probe === true || args.probe === 'mongo'

async function probeMongo() {
  const result = {
    requested: probeRequested,
    connected: false,
    topology: 'unknown',
    sessionsSupported: false,
    transactionsSupported: false,
    result: probeRequested ? 'not-run' : 'not-requested'
  }

  if (!probeRequested) return result
  if (!configured('MONGODB_URI')) {
    result.result = 'not-configured'
    return result
  }

  let mongoose
  try {
    mongoose = backendRequire(root)('mongoose')
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      maxPoolSize: 1
    })

    const hello = await mongoose.connection.db.admin().command({ hello: 1 })
    const isSharded = hello?.msg === 'isdbgrid'
    const isReplicaSet = Boolean(hello?.setName)
    const sessionsSupported = Number.isFinite(hello?.logicalSessionTimeoutMinutes)

    result.connected = true
    result.topology = isSharded ? 'sharded' : isReplicaSet ? 'replica-set' : 'standalone'
    result.sessionsSupported = sessionsSupported
    result.transactionsSupported = sessionsSupported && (isSharded || isReplicaSet)
    result.result = 'passed'
  } catch (error) {
    result.result = 'failed'
    result.failureCategory = classifyError(error)
  } finally {
    if (mongoose?.connection?.readyState) {
      try {
        await mongoose.disconnect()
      } catch {
        // The report intentionally suppresses connection details and close errors.
      }
    }
  }

  return result
}

const storageModeRaw = configured('STORAGE_MODE')
  ? process.env.STORAGE_MODE.trim().toLowerCase()
  : 'default'
const storageMode = ['local', 's3'].includes(storageModeRaw) ? storageModeRaw : 'unknown'
const s3RequiredKeys = ['S3_REGION', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_BUCKET_NAME']
const pushKeys = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT']
const nodeMajor = Number(process.versions.node.split('.')[0])

const report = {
  reportVersion: 1,
  reportType: 'fellow-environment',
  generatedAt: new Date().toISOString(),
  containsSecrets: false,
  evidenceLevel: probeRequested ? 'runtime-probed' : 'configuration-presence-only',
  source: {
    environmentFilePresent: environmentLoad.envFilePresent,
    environmentLoaded: environmentLoad.loaded,
    loader: environmentLoad.loader,
    declaredEnvironmentKeyCount: readDeclaredEnvKeys(root).length
  },
  runtime: {
    nodeMajor,
    nodeSupported: Number.isFinite(nodeMajor) && nodeMajor >= 20,
    nodeEnvironment: ['production', 'development', 'test'].includes(process.env.NODE_ENV)
      ? process.env.NODE_ENV
      : configured('NODE_ENV') ? 'other' : 'unset',
    backendPackagePresent: existsSync(resolve(root, 'backend/package.json'))
  },
  service: {
    httpPortConfigured: configured('PORT'),
    webSocketPortConfigured: configured('WS_PORT')
  },
  database: {
    configured: configured('MONGODB_URI'),
    uriScheme: classifyMongoScheme(process.env.MONGODB_URI),
    ...(await probeMongo())
  },
  authentication: {
    jwtSecretConfigured: configured('JWT_SECRET'),
    jwtExpiryConfigured: configured('JWT_EXPIRES')
  },
  networkBoundary: {
    corsConfigured: configured('CORS_ORIGINS'),
    corsOriginCount: countConfiguredCsv('CORS_ORIGINS'),
    trustProxyConfigured: configured('TRUST_PROXY_HOPS')
  },
  webPush: {
    configured: pushKeys.some(configured),
    complete: configuredAll(pushKeys),
    configuredParts: {
      publicKey: configured('VAPID_PUBLIC_KEY'),
      privateKey: configured('VAPID_PRIVATE_KEY'),
      subject: configured('VAPID_SUBJECT')
    }
  },
  storage: {
    mode: storageMode,
    s3Configured: s3RequiredKeys.some(configured),
    s3Complete: configuredAll(s3RequiredKeys),
    customEndpointConfigured: configured('S3_ENDPOINT')
  },
  backup: {
    backupScriptPresent: existsSync(resolve(root, 'backend/scripts/backup-db.js')),
    lastSuccessfulBackup: 'unknown',
    restoreDrill: 'unknown'
  },
  limitations: [
    'Configuration presence does not prove that a dependency is reachable.',
    'Storage reachability, reverse-proxy routing, TLS, PM2 state, backup freshness and restore readiness are not probed.',
    'No environment variable value is included in this report.'
  ]
}

writeJsonReport(report, args.output, root)
process.exitCode = report.runtime.nodeSupported && (!probeRequested || report.database.result === 'passed') ? 0 : 1
