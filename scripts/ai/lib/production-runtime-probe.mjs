import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import { join } from 'node:path'
import {
  buildUnsupportedChecks,
  exceptionalCategory,
  validateProductionRuntimeReport
} from './production-runtime-contract.mjs'

const APPLICATION_DIRECTORY = '/www/wwwroot/couple-website'
const DEFAULT_BACKUP_DIRECTORY = join(APPLICATION_DIRECTORY, 'backend', 'backups')
const CANONICAL_PM2_NAME = 'couple-app-backend'
const LEGACY_PM2_NAME = 'couple-backend'
const HTTP_PORT = 3000
const WEBSOCKET_PORT = 3001
const COMMAND_TIMEOUT_MS = 4000
const IO_TIMEOUT_MS = 3000
const MAX_COMMAND_OUTPUT_BYTES = 64 * 1024
const MAX_HANDSHAKE_BYTES = 8 * 1024
const MAX_BACKUP_FILES = 128

function classifyError(error) {
  const code = String(error?.code || '')
  const message = String(error?.message || '')
  if (code === 'ETIMEDOUT' || error?.killed || /timed?\s*out/iu.test(message)) return 'timeout'
  if (code === 'EACCES' || code === 'EPERM') return 'permission_denied'
  if (code === 'ENOENT' || code === 'ENOSYS' || code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
    return 'unsupported'
  }
  return 'fail'
}

function withTimeout(promise, timeoutMs) {
  let timer
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ outcome: 'timeout' }), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function command(commandName, args, timeoutMs = COMMAND_TIMEOUT_MS) {
  return new Promise((resolve) => {
    execFile(commandName, args, {
      timeout: timeoutMs,
      windowsHide: true,
      maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
      encoding: 'utf8'
    }, (error, stdout) => {
      if (!error) {
        resolve({ outcome: 'pass', stdout: String(stdout || '') })
        return
      }
      resolve({
        outcome: classifyError(error),
        stdout: String(stdout || '')
      })
    })
  })
}

async function statDirectory(target, timeoutMs = IO_TIMEOUT_MS) {
  return withTimeout(
    fs.stat(target)
      .then((stat) => ({ outcome: stat.isDirectory() ? 'pass' : 'missing' }))
      .catch((error) => ({ outcome: error?.code === 'ENOENT' ? 'missing' : classifyError(error) })),
    timeoutMs
  )
}

async function latestBackupMetadata(target, timeoutMs = IO_TIMEOUT_MS) {
  const entriesResult = await withTimeout(
    fs.readdir(target, { withFileTypes: true })
      .then((entries) => ({ outcome: 'pass', entries }))
      .catch((error) => ({ outcome: error?.code === 'ENOENT' ? 'missing' : classifyError(error) })),
    timeoutMs
  )
  if (entriesResult.outcome !== 'pass') return entriesResult

  const candidates = entriesResult.entries
    .filter((entry) => entry.isFile() && /^backup_.+\.gz$/u.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .slice(-MAX_BACKUP_FILES)

  if (!candidates.length) return { outcome: 'missing' }

  const metadata = await Promise.all(candidates.map(async (name) => {
    const result = await withTimeout(
      fs.stat(join(target, name))
        .then((stat) => ({ outcome: 'pass', mtimeMs: stat.mtimeMs, sizeBytes: stat.size }))
        .catch((error) => ({ outcome: classifyError(error) })),
      timeoutMs
    )
    return result
  }))

  const readable = metadata.filter((entry) => entry.outcome === 'pass')
  if (readable.length) {
    return readable.reduce((latest, entry) => entry.mtimeMs > latest.mtimeMs ? entry : latest)
  }
  if (metadata.some((entry) => entry.outcome === 'permission_denied')) {
    return { outcome: 'permission_denied' }
  }
  if (metadata.some((entry) => entry.outcome === 'timeout')) return { outcome: 'timeout' }
  return { outcome: 'unsupported' }
}

function checkHttp(timeoutMs = IO_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(result)
    }
    const request = http.get({
      hostname: '127.0.0.1',
      port: HTTP_PORT,
      path: '/api/vapid-public-key',
      timeout: timeoutMs
    }, (response) => {
      response.destroy()
      finish({ outcome: response.statusCode >= 200 && response.statusCode < 400 ? 'pass' : 'fail' })
    })
    const timer = setTimeout(() => {
      request.destroy()
      finish({ outcome: 'timeout' })
    }, timeoutMs)
    request.once('timeout', () => {
      request.destroy()
      finish({ outcome: 'timeout' })
    })
    request.once('error', (error) => finish({ outcome: classifyError(error) }))
  })
}

function checkPort(port, timeoutMs = IO_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false
    const socket = net.createConnection({ host: '127.0.0.1', port })
    const finish = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.destroy()
      resolve(result)
    }
    const timer = setTimeout(() => finish({ outcome: 'timeout' }), timeoutMs)
    socket.once('connect', () => finish({ outcome: 'pass' }))
    socket.once('error', (error) => finish({ outcome: classifyError(error) }))
  })
}

function checkWebSocket(timeoutMs = IO_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false
    let response = ''
    const socket = net.createConnection({ host: '127.0.0.1', port: WEBSOCKET_PORT })
    const finish = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.destroy()
      resolve(result)
    }
    const timer = setTimeout(() => finish({ outcome: 'timeout' }), timeoutMs)

    socket.once('connect', () => {
      const key = randomBytes(16).toString('base64')
      socket.write([
        'GET / HTTP/1.1',
        'Host: localhost',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${key}`,
        'Sec-WebSocket-Version: 13',
        '',
        ''
      ].join('\r\n'))
    })
    socket.on('data', (chunk) => {
      response += chunk.toString('ascii')
      if (response.length > MAX_HANDSHAKE_BYTES) {
        finish({ outcome: 'fail' })
        return
      }
      if (response.includes('\r\n\r\n')) {
        finish({ outcome: /^HTTP\/1\.[01] 101\b/u.test(response) ? 'pass' : 'fail' })
      }
    })
    socket.once('error', (error) => finish({ outcome: classifyError(error) }))
    socket.once('end', () => finish({ outcome: 'fail' }))
  })
}

export function createRuntimeAdapter() {
  return {
    nodeVersion: process.versions.node,
    command: (name) => {
      if (name === 'npm') return command('npm', ['--version'])
      if (name === 'disk') return command('df', ['-P', '/'])
      // PM2's CLI initializes PM2_HOME and may launch a daemon. Until Issue #19
      // provides a reviewed non-mutating bridge, the honest read-only result is
      // unsupported. Synthetic fixtures still verify the strict parser.
      if (name === 'pm2') return Promise.resolve({ outcome: 'unsupported' })
      if (name === 'nginx') {
        return command('systemctl', [
          'show',
          'nginx',
          '--property=LoadState',
          '--property=ActiveState',
          '--no-pager'
        ])
      }
      return Promise.resolve({ outcome: 'unsupported' })
    },
    directory: (name) => statDirectory(
      name === 'applicationDirectory' ? APPLICATION_DIRECTORY : DEFAULT_BACKUP_DIRECTORY
    ),
    latestDefaultBackup: () => latestBackupMetadata(DEFAULT_BACKUP_DIRECTORY),
    network: (name) => {
      if (name === 'http') return checkHttp()
      if (name === 'websocket') return checkWebSocket()
      if (name === 'port3000') return checkPort(HTTP_PORT)
      if (name === 'port3001') return checkPort(WEBSOCKET_PORT)
      return Promise.resolve({ outcome: 'unsupported' })
    }
  }
}

export function createFixtureAdapter(fixture) {
  return {
    nodeVersion: fixture.nodeVersion,
    command: async (name) => fixture.commands[name],
    directory: async (name) => fixture.filesystem[name],
    latestDefaultBackup: async () => fixture.filesystem.latestDefaultBackup,
    network: async (name) => fixture.network[name]
  }
}

function nodeVersionCategory(version) {
  const major = Number(String(version || '').split('.')[0])
  if (!Number.isFinite(major)) return 'unknown'
  return major >= 20 ? 'supported' : 'unsupported'
}

function booleanResult(observation) {
  const exceptional = exceptionalCategory(observation?.outcome)
  if (exceptional) return exceptional
  return observation?.outcome === 'pass'
}

function healthResult(observation) {
  return exceptionalCategory(observation?.outcome) || (observation?.outcome === 'pass' ? 'pass' : 'fail')
}

function diskUsageResult(observation) {
  const exceptional = exceptionalCategory(observation?.outcome)
  if (exceptional) return exceptional
  if (observation?.outcome !== 'pass') return 'unsupported'
  const lines = String(observation.stdout || '').trim().split(/\r?\n/u)
  const fields = lines.at(-1)?.trim().split(/\s+/u) || []
  const match = fields.find((field) => /^\d{1,3}%$/u.test(field))
  const percent = match ? Number.parseInt(match, 10) : Number.NaN
  return Number.isInteger(percent) && percent >= 0 && percent <= 100 ? percent : 'unsupported'
}

function backupAgeCategory(observation, nowMs) {
  const exceptional = exceptionalCategory(observation?.outcome)
  if (exceptional) return exceptional
  if (observation?.outcome !== 'pass') return 'missing'
  const ageHours = Number.isFinite(observation.ageHours)
    ? observation.ageHours
    : (nowMs - observation.mtimeMs) / (60 * 60 * 1000)
  if (!Number.isFinite(ageHours) || ageHours < 0) return 'unsupported'
  if (ageHours <= 36) return 'fresh'
  if (ageHours <= 72) return 'aging'
  return 'stale'
}

function backupSizeCategory(observation) {
  const exceptional = exceptionalCategory(observation?.outcome)
  if (exceptional) return exceptional
  if (observation?.outcome !== 'pass') return 'missing'
  const size = observation.sizeBytes
  if (!Number.isFinite(size) || size < 0) return 'unsupported'
  if (size === 0) return 'empty'
  if (size < 10 * 1024 * 1024) return 'small'
  if (size < 1024 * 1024 * 1024) return 'medium'
  return 'large'
}

function pm2Status(observation) {
  const exceptional = exceptionalCategory(observation?.outcome)
  if (exceptional) return exceptional
  if (observation?.outcome !== 'pass') return 'degraded'
  try {
    const apps = JSON.parse(observation.stdout)
    if (!Array.isArray(apps)) return 'degraded'
    const canonical = apps.filter((app) => app?.name === CANONICAL_PM2_NAME)
    const hasLegacy = apps.some((app) => app?.name === LEGACY_PM2_NAME)
    if (!canonical.length && !hasLegacy) return 'missing'
    return canonical.length === 1 && !hasLegacy && canonical[0]?.pm2_env?.status === 'online'
      ? 'healthy'
      : 'degraded'
  } catch {
    return 'degraded'
  }
}

function nginxStatus(observation) {
  const exceptional = exceptionalCategory(observation?.outcome)
  if (exceptional) return exceptional
  if (observation?.outcome === 'missing') return 'missing'
  const properties = Object.fromEntries(
    String(observation?.stdout || '')
      .trim()
      .split(/\r?\n/u)
      .map((line) => line.split('=', 2))
      .filter(([key, value]) => key && value)
  )
  if (properties.LoadState === 'not-found') return 'missing'
  if (properties.LoadState !== 'loaded') return 'unsupported'
  if (properties.ActiveState === 'active') return 'active'
  if (['inactive', 'failed', 'activating', 'deactivating'].includes(properties.ActiveState)) {
    return 'inactive'
  }
  return 'unsupported'
}

function exceptionalField(checks, field, observation, value) {
  if (exceptionalCategory(observation?.outcome) || value === 'unsupported') checks.push(field)
}

export async function probeProductionRuntime({
  adapter = createRuntimeAdapter(),
  now = new Date()
} = {}) {
  const [
    npm,
    disk,
    pm2,
    nginx,
    applicationDirectory,
    defaultBackupDirectory,
    httpResult,
    websocketResult,
    port3000,
    port3001
  ] = await Promise.all([
    adapter.command('npm'),
    adapter.command('disk'),
    adapter.command('pm2'),
    adapter.command('nginx'),
    adapter.directory('applicationDirectory'),
    adapter.directory('defaultBackupDirectory'),
    adapter.network('http'),
    adapter.network('websocket'),
    adapter.network('port3000'),
    adapter.network('port3001')
  ])

  const latestBackup = defaultBackupDirectory?.outcome === 'pass'
    ? await adapter.latestDefaultBackup()
    : defaultBackupDirectory

  const unsupported = []
  const report = {
    generatedAt: now.toISOString(),
    nodeVersionCategory: nodeVersionCategory(adapter.nodeVersion),
    npmAvailable: booleanResult(npm),
    applicationDirectoryPresent: booleanResult(applicationDirectory),
    httpHealth: healthResult(httpResult),
    websocketHealth: healthResult(websocketResult),
    port3000Listening: booleanResult(port3000),
    port3001Listening: booleanResult(port3001),
    rootDiskUsagePercent: diskUsageResult(disk),
    defaultBackupDirectoryPresent: booleanResult(defaultBackupDirectory),
    latestDefaultBackupAgeCategory: backupAgeCategory(latestBackup, now.getTime()),
    latestDefaultBackupSizeCategory: backupSizeCategory(latestBackup),
    pm2Status: pm2Status(pm2),
    nginxStatus: nginxStatus(nginx),
    unsupportedChecks: []
  }

  for (const [field, observation] of [
    ['npmAvailable', npm],
    ['applicationDirectoryPresent', applicationDirectory],
    ['httpHealth', httpResult],
    ['websocketHealth', websocketResult],
    ['port3000Listening', port3000],
    ['port3001Listening', port3001],
    ['rootDiskUsagePercent', disk],
    ['defaultBackupDirectoryPresent', defaultBackupDirectory],
    ['latestDefaultBackupAgeCategory', latestBackup],
    ['latestDefaultBackupSizeCategory', latestBackup],
    ['pm2Status', pm2],
    ['nginxStatus', nginx]
  ]) {
    exceptionalField(unsupported, field, observation, report[field])
  }
  report.unsupportedChecks = buildUnsupportedChecks(unsupported)

  const findings = validateProductionRuntimeReport(report)
  if (findings.length) throw new Error('production runtime report contract violation')
  return report
}
