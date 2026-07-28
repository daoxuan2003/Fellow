#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const SOURCE_COMMIT = 'a82ae11fb8a2428ade1f4bff0e84da40b9811067'

export const PAYLOAD_HASHES = Object.freeze({
  'scripts/ai/production-runtime-report.mjs': 'fc48fc7b8a8b1161fa6dd81121f9b68bdd7e4f2cabdaaceab613c40b8f57fcce',
  'scripts/ai/lib/production-runtime-probe.mjs': 'feca02340cf3bd5f113d9256f1c24eaac37374e5fc462e2cef4011df96c3cb2b',
  'scripts/ai/lib/production-runtime-contract.mjs': 'f7066b119a8d0120acfd58c9facdab5b0c5ecc322160d19250d2b53b1bda3a4e',
  'scripts/ai/report-safety-check.mjs': 'd7afb7fed204b792d2f9a025d09d67a95589b2313fbddd8c8d6fccb51413275a',
  'scripts/ai/lib/safe-report-utils.mjs': '7d08d9d3f9e1b205d0bab704ded99f72cc68e37fb0385327ae4492cc4637be9e'
})

const PACKAGE_ROOT = `/opt/fellow-runtime-observer/${SOURCE_COMMIT}`

export const INSTALL_CONFIG = Object.freeze({
  packageRoot: PACKAGE_ROOT,
  packageDirectories: Object.freeze([
    '/opt/fellow-runtime-observer',
    PACKAGE_ROOT
  ]),
  payloadHashes: PAYLOAD_HASHES,
  temporaryParent: '/var/lib/fellow-runtime-observer',
  temporaryRoot: '/var/lib/fellow-runtime-observer/runtime-baseline',
  nodePath: '/usr/bin/node',
  reportPath: join(PACKAGE_ROOT, 'scripts/ai/production-runtime-report.mjs'),
  contractPath: join(PACKAGE_ROOT, 'scripts/ai/lib/production-runtime-contract.mjs'),
  safetyPath: join(PACKAGE_ROOT, 'scripts/ai/report-safety-check.mjs'),
  reportTimeoutMs: 20_000,
  safetyTimeoutMs: 5_000,
  maxChildOutputBytes: 128 * 1024,
  maxReportBytes: 64 * 1024,
  enforcePosixOwnership: true,
  environment: Object.freeze({
    PATH: '/usr/bin:/bin',
    HOME: '/nonexistent',
    LANG: 'C',
    LC_ALL: 'C',
    TZ: 'UTC'
  })
})

function assertRootOwnedDirectory(path) {
  const stat = lstatSync(path)
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    realpathSync(path) !== path ||
    stat.uid !== 0 ||
    (stat.mode & 0o022) !== 0
  ) {
    throw new Error('unsafe package directory')
  }
}

export function verifyInstalledPayload(config = INSTALL_CONFIG) {
  if (config.enforcePosixOwnership) {
    const directories = new Set(config.packageDirectories)
    for (const relativePath of Object.keys(config.payloadHashes)) {
      const segments = relativePath.split('/')
      for (let index = 1; index < segments.length; index += 1) {
        directories.add(join(config.packageRoot, ...segments.slice(0, index)))
      }
    }
    for (const directory of directories) assertRootOwnedDirectory(directory)
  }

  for (const [relativePath, expectedHash] of Object.entries(config.payloadHashes)) {
    const absolutePath = join(config.packageRoot, relativePath)
    const stat = lstatSync(absolutePath)
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('unsafe package file')
    if (config.enforcePosixOwnership && (stat.uid !== 0 || (stat.mode & 0o022) !== 0)) {
      throw new Error('unsafe package file')
    }
    if (realpathSync(absolutePath) !== absolutePath) throw new Error('unexpected package path')
    const actualHash = createHash('sha256').update(readFileSync(absolutePath)).digest('hex')
    if (actualHash !== expectedHash) throw new Error('package integrity failure')
  }
}

function runFixedNode(config, script, args, timeoutMs) {
  const result = spawnSync(config.nodePath, [script, ...args], {
    cwd: config.packageRoot,
    env: config.environment,
    encoding: 'utf8',
    timeout: timeoutMs,
    killSignal: 'SIGKILL',
    maxBuffer: config.maxChildOutputBytes,
    shell: false,
    windowsHide: true
  })
  if (result.error || result.signal || result.status !== 0 || typeof result.stdout !== 'string') {
    throw new Error('fixed command failure')
  }
  return result.stdout
}

function verifyTemporaryRoot(config) {
  if (config.enforcePosixOwnership) assertRootOwnedDirectory(config.temporaryParent)
  const stat = lstatSync(config.temporaryRoot)
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    realpathSync(config.temporaryRoot) !== config.temporaryRoot
  ) {
    throw new Error('unsafe temporary directory')
  }
  if (!config.enforcePosixOwnership) return
  if (stat.uid !== 0 || stat.gid !== process.getgid() || (stat.mode & 0o777) !== 0o730) {
    throw new Error('unsafe temporary directory')
  }
}

export async function executeRuntimeBaseline(config = INSTALL_CONFIG) {
  process.umask(0o077)
  let temporaryDirectory = null
  let safeOutput = null

  try {
    verifyInstalledPayload(config)
    verifyTemporaryRoot(config)

    const { validateProductionRuntimeReport } = await import(
      `${pathToFileURL(config.contractPath).href}?integrity=${Date.now()}`
    )
    const rawReport = runFixedNode(config, config.reportPath, [], config.reportTimeoutMs)
    const report = JSON.parse(rawReport)
    if (validateProductionRuntimeReport(report).length !== 0) {
      throw new Error('strict contract failure')
    }

    const serialized = `${JSON.stringify(report, null, 2)}\n`
    if (Buffer.byteLength(serialized, 'utf8') > config.maxReportBytes) {
      throw new Error('report exceeds output limit')
    }

    temporaryDirectory = mkdtempSync(join(config.temporaryRoot, 'run-'))
    const temporaryReport = join(temporaryDirectory, 'report.json')
    writeFileSync(temporaryReport, serialized, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    runFixedNode(config, config.safetyPath, [temporaryReport], config.safetyTimeoutMs)
    safeOutput = serialized
  } catch {
    safeOutput = null
  } finally {
    if (temporaryDirectory !== null) {
      try {
        rmSync(temporaryDirectory, { recursive: true, force: true })
      } catch {
        safeOutput = null
      }
    }
  }

  if (safeOutput === null) throw new Error('runtime baseline failed safely')
  return safeOutput
}

export function invocationHasArguments(argv = process.argv) {
  return argv.length !== 2
}

async function main() {
  if (invocationHasArguments()) {
    process.stderr.write('runtime-baseline rejects arguments.\n')
    process.exitCode = 64
    return
  }

  try {
    process.stdout.write(await executeRuntimeBaseline())
  } catch {
    process.stderr.write('runtime-baseline failed safely.\n')
    process.exitCode = 1
  }
}

const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (import.meta.url === entryUrl) await main()
