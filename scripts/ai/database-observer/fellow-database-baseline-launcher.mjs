#!/usr/bin/node

import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const WRAPPER = '/usr/local/libexec/fellow-database-baseline-wrapper.mjs'
const ENVIRONMENT = Object.freeze({
  PATH: '/usr/bin:/bin',
  HOME: '/nonexistent',
  LANG: 'C',
  LC_ALL: 'C',
  TZ: 'UTC'
})

export function invocationHasArguments(argv = process.argv) {
  return argv.length !== 2
}

export function launchDatabaseBaseline({ spawn = spawnSync } = {}) {
  const result = spawn(
    '/usr/bin/timeout',
    [
      '--signal=KILL',
      '--kill-after=1s',
      '30s',
      '/usr/bin/prlimit',
      '--core=0',
      '--nofile=64',
      '--nproc=32',
      '--fsize=131072',
      '--as=1610612736',
      '--cpu=25',
      '--',
      '/usr/bin/node',
      WRAPPER
    ],
    {
      cwd: '/var/lib/fellow-database-observer/database-baseline',
      env: ENVIRONMENT,
      encoding: 'utf8',
      timeout: 32_000,
      killSignal: 'SIGKILL',
      maxBuffer: 64 * 1024,
      shell: false,
      windowsHide: true
    }
  )
  if (
    result.error ||
    result.signal ||
    result.status !== 0 ||
    typeof result.stdout !== 'string' ||
    Buffer.byteLength(result.stdout, 'utf8') > 16 * 1024 ||
    (typeof result.stderr === 'string' && result.stderr.length !== 0)
  ) {
    throw new Error('database launcher failure')
  }
  return result.stdout
}

async function main() {
  if (invocationHasArguments()) {
    process.stderr.write('database-baseline launcher rejects arguments.\n')
    process.exitCode = 64
    return
  }
  try {
    process.stdout.write(launchDatabaseBaseline())
  } catch {
    process.stderr.write('database-baseline failed safely.\n')
    process.exitCode = 1
  }
}

const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (import.meta.url === entryUrl) await main()
