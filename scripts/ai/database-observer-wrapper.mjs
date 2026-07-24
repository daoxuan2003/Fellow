#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

export const SOURCE_COMMIT = '5124d83f93a4faf76de6e4b629d67cdb48414a42'
export const INTEGRITY_MANIFEST_SHA256 = '53b276498383fc59a81734b76d972f3e85a4c1624dd5e6f41ad8994b820dbbf4'

const PACKAGE_ROOT = `/opt/fellow-database-observer/${SOURCE_COMMIT}`

export const INSTALL_CONFIG = Object.freeze({
  packageRoot: PACKAGE_ROOT,
  packageParents: Object.freeze(['/opt/fellow-database-observer', PACKAGE_ROOT]),
  integrityPath: join(PACKAGE_ROOT, 'database-observer-integrity.json'),
  integritySha256: INTEGRITY_MANIFEST_SHA256,
  temporaryParent: '/var/lib/fellow-database-observer',
  temporaryRoot: '/var/lib/fellow-database-observer/database-baseline',
  secretParent: '/etc/fellow-database-observer',
  secretPath: '/etc/fellow-database-observer/mongodb-uri',
  nodePath: '/usr/bin/node',
  reportPath: join(PACKAGE_ROOT, 'scripts/ai/database-inspect.mjs'),
  policyPath: join(PACKAGE_ROOT, 'scripts/ai/inspection-policy.json'),
  contractPath: join(PACKAGE_ROOT, 'scripts/ai/lib/database-inspection-contract.mjs'),
  safetyPath: join(PACKAGE_ROOT, 'scripts/ai/report-safety-check.mjs'),
  inspectionTimeoutMs: 20_000,
  safetyTimeoutMs: 5_000,
  maxChildOutputBytes: 64 * 1024,
  maxReportBytes: 16 * 1024,
  maxSecretBytes: 4 * 1024,
  enforcePosixOwnership: true,
  environment: Object.freeze({
    PATH: '/usr/bin:/bin',
    HOME: '/nonexistent',
    LANG: 'C',
    LC_ALL: 'C',
    TZ: 'UTC'
  })
})

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

export function assertRootDirectoryStat(stat, resolvedPathMatches, { exactMode = null } = {}) {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    !resolvedPathMatches ||
    stat.uid !== 0 ||
    stat.gid !== 0 ||
    (stat.mode & 0o022) !== 0 ||
    (exactMode !== null && (stat.mode & 0o777) !== exactMode)
  ) {
    throw new Error('unsafe root directory')
  }
  return true
}

function assertRootDirectory(path, options = {}) {
  const stat = lstatSync(path)
  return assertRootDirectoryStat(stat, realpathSync(path) === path, options)
}

function assertSafeMemberShape(member, packageRoot) {
  if (
    !member ||
    Object.keys(member).sort().join(',') !== 'bytes,installPath,mode,owner,path,sha256' ||
    typeof member.path !== 'string' ||
    !member.path ||
    member.path.startsWith('/') ||
    member.path.includes('\\') ||
    member.path.split('/').some((segment) => !segment || segment === '.' || segment === '..') ||
    !Number.isSafeInteger(member.bytes) ||
    member.bytes < 0 ||
    !/^[0-9a-f]{64}$/u.test(member.sha256) ||
    member.owner !== 'root:root' ||
    member.mode !== '0444' ||
    member.installPath !== `${packageRoot}/${member.path}`
  ) {
    throw new Error('invalid integrity member')
  }
}

export function assertPackageFileOwnership(stat, expectedMode = 0o444) {
  if (stat.uid !== 0 || stat.gid !== 0 || (stat.mode & 0o777) !== expectedMode) {
    throw new Error('unsafe package member ownership')
  }
  return true
}

function listInstalledFiles(directory, relativeDirectory = '', { enforcePosixOwnership = true } = {}) {
  const files = []
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, item.name)
    const relativePath = relativeDirectory ? `${relativeDirectory}/${item.name}` : item.name
    const stat = lstatSync(absolutePath)
    if (stat.isSymbolicLink()) throw new Error('installed link is forbidden')
    if (stat.isDirectory()) {
      if (realpathSync(absolutePath) !== absolutePath) throw new Error('unexpected installed directory')
      if (enforcePosixOwnership) assertRootDirectory(absolutePath)
      files.push(...listInstalledFiles(absolutePath, relativePath, { enforcePosixOwnership }))
      continue
    }
    if (!stat.isFile()) throw new Error('installed special file is forbidden')
    if (stat.nlink !== 1) throw new Error('installed link is forbidden')
    files.push(relativePath.replaceAll(sep, '/'))
  }
  return files
}

export function verifyInstalledPayload(config = INSTALL_CONFIG) {
  if (config.enforcePosixOwnership) {
    for (const path of config.packageParents) assertRootDirectory(path)
  }
  const integrityStat = lstatSync(config.integrityPath)
  if (!integrityStat.isFile() || integrityStat.isSymbolicLink() || integrityStat.nlink !== 1) {
    throw new Error('unsafe integrity manifest')
  }
  if (config.enforcePosixOwnership) assertPackageFileOwnership(integrityStat)
  const integrityBuffer = readFileSync(config.integrityPath)
  if (sha256(integrityBuffer) !== config.integritySha256) throw new Error('integrity manifest mismatch')
  const integrity = JSON.parse(integrityBuffer.toString('utf8'))
  if (
    Object.keys(integrity).sort().join(',') !== 'containsSecrets,members,packageRoot,schemaVersion,sourceCommit' ||
    integrity.schemaVersion !== 1 ||
    integrity.containsSecrets !== false ||
    integrity.sourceCommit !== SOURCE_COMMIT ||
    integrity.packageRoot !== config.packageRoot ||
    !Array.isArray(integrity.members) ||
    integrity.members.length < 1
  ) {
    throw new Error('invalid integrity manifest')
  }

  const expectedFiles = new Set(['database-observer-integrity.json'])
  const directories = new Set(config.packageParents)
  for (const member of integrity.members) {
    assertSafeMemberShape(member, config.packageRoot)
    if (expectedFiles.has(member.path)) throw new Error('duplicate integrity member')
    expectedFiles.add(member.path)
    const segments = member.path.split('/')
    for (let index = 1; index < segments.length; index += 1) {
      directories.add(join(config.packageRoot, ...segments.slice(0, index)))
    }
    const absolutePath = join(config.packageRoot, ...segments)
    const stat = lstatSync(absolutePath)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || realpathSync(absolutePath) !== absolutePath) {
      throw new Error('unsafe package member')
    }
    if (stat.size !== member.bytes) throw new Error('package member byte mismatch')
    if (config.enforcePosixOwnership) assertPackageFileOwnership(stat, Number.parseInt(member.mode, 8))
    if (sha256(readFileSync(absolutePath)) !== member.sha256) throw new Error('package member hash mismatch')
  }
  if (config.enforcePosixOwnership) {
    for (const directory of directories) assertRootDirectory(directory)
  }
  const actualFiles = new Set(listInstalledFiles(config.packageRoot, '', {
    enforcePosixOwnership: config.enforcePosixOwnership
  }))
  if (
    actualFiles.size !== expectedFiles.size ||
    [...actualFiles].some((path) => !expectedFiles.has(path))
  ) {
    throw new Error('unexpected installed package member')
  }
  return integrity
}

function verifySecretBoundary(config) {
  const parent = lstatSync(config.secretParent)
  if (
    !parent.isDirectory() ||
    parent.isSymbolicLink() ||
    realpathSync(config.secretParent) !== config.secretParent ||
    (config.enforcePosixOwnership && (parent.uid !== 0 || parent.gid !== 0 || (parent.mode & 0o022) !== 0))
  ) {
    throw new Error('unsafe secret directory')
  }
  const stat = lstatSync(config.secretPath)
  assertSecretFileType(stat, realpathSync(config.secretPath) === config.secretPath)
  if (stat.size < 1 || stat.size > config.maxSecretBytes) throw new Error('invalid secret size')
  assertSecretFileOwnership(stat, config.enforcePosixOwnership ? process.getgid() : null)
  const raw = readFileSync(config.secretPath, 'utf8')
  const value = raw.endsWith('\n') ? raw.slice(0, -1) : raw
  if (
    !value ||
    value !== value.trim() ||
    value.includes('\n') ||
    value.includes('\r') ||
    /[\u0000-\u001f\u007f]/u.test(value) ||
    !(value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'))
  ) {
    throw new Error('invalid database secret')
  }
  return value
}

export function assertSecretFileType(stat, resolvedPathMatches) {
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || !resolvedPathMatches) {
    throw new Error('unsafe secret file')
  }
  return true
}

export function assertSecretFileOwnership(stat, expectedGid) {
  if (expectedGid === null) return true
  if (stat.uid !== 0 || stat.gid !== expectedGid || (stat.mode & 0o777) !== 0o440) {
    throw new Error('unsafe secret ownership')
  }
  return true
}

function verifyTemporaryRoot(config) {
  if (config.enforcePosixOwnership) assertRootDirectory(config.temporaryParent, { exactMode: 0o711 })
  const stat = lstatSync(config.temporaryRoot)
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    realpathSync(config.temporaryRoot) !== config.temporaryRoot
  ) {
    throw new Error('unsafe temporary directory')
  }
  if (
    config.enforcePosixOwnership &&
    (stat.uid !== 0 || stat.gid !== process.getgid() || (stat.mode & 0o777) !== 0o730)
  ) {
    throw new Error('unsafe temporary directory ownership')
  }
}

function runFixedNode(config, script, args, timeoutMs, environment, acceptedExitCodes = [0]) {
  const result = spawnSync(config.nodePath, [script, ...args], {
    cwd: config.packageRoot,
    env: environment,
    encoding: 'utf8',
    timeout: timeoutMs,
    killSignal: 'SIGKILL',
    maxBuffer: config.maxChildOutputBytes,
    shell: false,
    windowsHide: true
  })
  if (
    result.error ||
    result.signal ||
    !acceptedExitCodes.includes(result.status) ||
    typeof result.stdout !== 'string' ||
    (typeof result.stderr === 'string' && result.stderr.length !== 0)
  ) {
    throw new Error('fixed command failure')
  }
  return { status: result.status, stdout: result.stdout }
}

export async function executeDatabaseBaseline(config = INSTALL_CONFIG) {
  process.umask(0o077)
  let temporaryDirectory = null
  let safeOutput = null
  try {
    verifyInstalledPayload(config)
    verifyTemporaryRoot(config)
    const databaseUri = verifySecretBoundary(config)
    const childEnvironment = Object.freeze({ ...config.environment, MONGODB_URI: databaseUri })
    const inspectionResult = runFixedNode(
      config,
      config.reportPath,
      [
        `--policy=${config.policyPath}`,
        '--max-time-ms=5000',
        '--total-timeout-ms=15000'
      ],
      config.inspectionTimeoutMs,
      childEnvironment,
      [0, 1]
    )
    const report = JSON.parse(inspectionResult.stdout)
    const { validateDatabaseInspectionReport } = await import(
      `${pathToFileURL(config.contractPath).href}?integrity=${Date.now()}`
    )
    const allowedPartial = report.status === 'partial' &&
      report.metrics?.status === 'passed' &&
      report.indexes?.status === 'passed' &&
      report.databaseCapabilities?.status === 'permission_denied'
    if (
      validateDatabaseInspectionReport(report).length !== 0 ||
      (inspectionResult.status === 0 && report.status !== 'passed') ||
      (inspectionResult.status === 1 && !allowedPartial)
    ) {
      throw new Error('strict database contract failure')
    }
    const serialized = `${JSON.stringify(report, null, 2)}\n`
    if (Buffer.byteLength(serialized, 'utf8') > config.maxReportBytes) {
      throw new Error('report exceeds output limit')
    }
    temporaryDirectory = mkdtempSync(join(config.temporaryRoot, 'run-'))
    const temporaryReport = join(temporaryDirectory, 'report.json')
    writeFileSync(temporaryReport, serialized, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    runFixedNode(config, config.safetyPath, [temporaryReport], config.safetyTimeoutMs, childEnvironment)
    safeOutput = serialized
  } catch {
    safeOutput = null
  } finally {
    if (temporaryDirectory !== null) {
      try {
        const cleanup = config.removeTemporary || rmSync
        cleanup(temporaryDirectory, { recursive: true, force: true })
      } catch {
        safeOutput = null
      }
    }
  }
  if (safeOutput === null) throw new Error('database baseline failed safely')
  return safeOutput
}

export function invocationHasArguments(argv = process.argv) {
  return argv.length !== 2
}

async function main() {
  if (invocationHasArguments()) {
    process.stderr.write('database-baseline rejects arguments.\n')
    process.exitCode = 64
    return
  }
  try {
    process.stdout.write(await executeDatabaseBaseline())
  } catch {
    process.stderr.write('database-baseline failed safely.\n')
    process.exitCode = 1
  }
}

const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (import.meta.url === entryUrl) await main()
