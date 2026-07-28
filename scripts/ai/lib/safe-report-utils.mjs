import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

export function parseArgs(argv) {
  const args = { positional: [] }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (!value.startsWith('--')) {
      args.positional.push(value)
      continue
    }

    const equalsIndex = value.indexOf('=')
    if (equalsIndex !== -1) {
      args[value.slice(2, equalsIndex)] = value.slice(equalsIndex + 1)
      continue
    }

    const key = value.slice(2)
    const next = argv[index + 1]
    if (next && !next.startsWith('--')) {
      args[key] = next
      index += 1
    } else {
      args[key] = true
    }
  }

  return args
}

function fallbackParseDotEnv(source) {
  const result = {}

  for (const rawLine of source.split(/\r?\n/u)) {
    let line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('export ')) line = line.slice(7).trim()

    const separator = line.indexOf('=')
    if (separator <= 0) continue

    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key)) continue

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      const quote = value[0]
      value = value.slice(1, -1)
      if (quote === '"') {
        value = value
          .replace(/\\n/gu, '\n')
          .replace(/\\r/gu, '\r')
          .replace(/\\t/gu, '\t')
          .replace(/\\"/gu, '"')
          .replace(/\\\\/gu, '\\')
      }
    } else {
      value = value.replace(/\s+#.*$/u, '').trim()
    }

    result[key] = value
  }

  return result
}

export function loadBackendEnvironment(root) {
  const envPath = resolve(root, 'backend/.env')
  const result = {
    envFilePresent: existsSync(envPath),
    loader: 'process-environment',
    loaded: false
  }

  if (!result.envFilePresent) return result

  try {
    const requireFromBackend = createRequire(resolve(root, 'backend/package.json'))
    const dotenv = requireFromBackend('dotenv')
    const response = dotenv.config({ path: envPath, quiet: true })
    result.loader = 'dotenv'
    result.loaded = !response.error
    return result
  } catch {
    try {
      const parsed = fallbackParseDotEnv(readFileSync(envPath, 'utf8'))
      for (const [key, value] of Object.entries(parsed)) {
        if (process.env[key] === undefined) process.env[key] = value
      }
      result.loader = 'fallback-parser'
      result.loaded = true
    } catch {
      result.loader = 'unavailable'
    }
  }

  return result
}

export function configured(key) {
  return typeof process.env[key] === 'string' && process.env[key].trim().length > 0
}

export function configuredAll(keys) {
  return keys.every(configured)
}

export function countConfiguredCsv(key) {
  if (!configured(key)) return 0
  return process.env[key]
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean).length
}

export function classifyMongoScheme(uri) {
  if (!uri) return 'unconfigured'
  if (uri.startsWith('mongodb+srv://')) return 'mongodb+srv'
  if (uri.startsWith('mongodb://')) return 'mongodb'
  return 'unknown'
}

export function classifyError(error) {
  const name = String(error?.name || '')
  const code = String(error?.code || '')

  if (code === 'ECONNREFUSED') return 'connection-refused'
  if (code === 'ETIMEDOUT' || name.includes('Timeout')) return 'timeout'
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns-failure'
  if (name.includes('ServerSelection')) return 'database-unreachable'
  if (name.includes('Authentication')) return 'authentication-failed'
  return 'unexpected-error'
}

export function readDeclaredEnvKeys(root) {
  const path = resolve(root, 'backend/.env.example')
  if (!existsSync(path)) return []

  return readFileSync(path, 'utf8')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => line.slice(0, line.indexOf('=')).trim())
    .filter((key) => /^[A-Za-z_][A-Za-z0-9_]*$/u.test(key))
    .sort()
}

export function backendRequire(root) {
  return createRequire(resolve(root, 'backend/package.json'))
}

export function writeJsonReport(report, outputPath, root) {
  const serialized = `${JSON.stringify(report, null, 2)}\n`

  if (!outputPath) {
    process.stdout.write(serialized)
    return null
  }

  const absolutePath = resolve(root, outputPath)
  mkdirSync(dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, serialized, { encoding: 'utf8', mode: 0o600 })
  process.stdout.write(`Safe report written: ${outputPath}\n`)
  return absolutePath
}

export function percentage(numerator, denominator) {
  if (!denominator) return null
  return Number(((numerator / denominator) * 100).toFixed(2))
}
