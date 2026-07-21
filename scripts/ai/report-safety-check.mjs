#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadBackendEnvironment, parseArgs } from './lib/safe-report-utils.mjs'

const root = resolve(import.meta.dirname, '../..')
const args = parseArgs(process.argv.slice(2))
loadBackendEnvironment(root)

const files = args.positional
if (!files.length) {
  process.stderr.write('Usage: node scripts/ai/report-safety-check.mjs <report.json> [...]\n')
  process.exit(2)
}

const sensitiveEnvKey = /(SECRET|PASSWORD|TOKEN|PRIVATE_KEY|ACCESS_KEY|MONGODB_URI)/iu
const sensitiveValues = Object.entries(process.env)
  .filter(([key, value]) => sensitiveEnvKey.test(key) && typeof value === 'string' && value.length >= 5)
  .map(([, value]) => value)

const forbiddenStringPatterns = [
  /mongodb(?:\+srv)?:\/\//iu,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/u,
  /AKIA[0-9A-Z]{16}/u,
  /https?:\/\/[^\s]+/iu,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/u
]

function scan(value, path, findings) {
  if (typeof value === 'string') {
    for (const pattern of forbiddenStringPatterns) {
      if (pattern.test(value)) findings.push(`${path}: forbidden string pattern`)
    }
    for (const secret of sensitiveValues) {
      if (value.includes(secret)) findings.push(`${path}: matches configured secret value`)
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => scan(entry, `${path}[${index}]`, findings))
    return
  }

  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      const nextPath = path ? `${path}.${key}` : key
      if (sensitiveEnvKey.test(key) && !['boolean', 'undefined'].includes(typeof entry)) {
        findings.push(`${nextPath}: sensitive-named field must be boolean or absent`)
      }
      scan(entry, nextPath, findings)
    }
  }
}

let failed = false
for (const file of files) {
  const path = resolve(root, file)
  const report = JSON.parse(readFileSync(path, 'utf8'))
  const findings = []

  if (report.containsSecrets !== false) findings.push('containsSecrets must be false')
  scan(report, '', findings)

  if (findings.length) {
    failed = true
    process.stderr.write(`${file}: unsafe\n`)
    for (const finding of findings) process.stderr.write(`- ${finding}\n`)
  } else {
    process.stdout.write(`${file}: safe\n`)
  }
}

process.exitCode = failed ? 1 : 0
