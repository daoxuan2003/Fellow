#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const input = process.argv[2]

if (!input) {
  process.stderr.write('Usage: node scripts/ai/visual-evidence-check.mjs <manifest.json>\n')
  process.exit(2)
}

const path = resolve(root, input)
if (!existsSync(path)) {
  process.stderr.write(`Visual evidence manifest not found: ${input}\n`)
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(path, 'utf8'))
const errors = []

if (manifest.containsSecrets !== false) errors.push('containsSecrets must be false')
if (manifest.syntheticDataConfirmed !== true) errors.push('syntheticDataConfirmed must be true after review')
if (!Array.isArray(manifest.evidence) || manifest.evidence.length === 0) errors.push('evidence must be a non-empty array')

for (const [index, item] of (manifest.evidence ?? []).entries()) {
  if (!item.route?.startsWith('/')) errors.push(`evidence[${index}] has an invalid route`)
  if (!item.viewport?.width || !item.viewport?.height) errors.push(`evidence[${index}] is missing viewport dimensions`)
  if (!item.state || item.state === 'replace-with-tested-state') errors.push(`evidence[${index}] needs a real tested state`)
  if (item.status !== 'captured') errors.push(`evidence[${index}] status must be captured`)
  if (!item.location) errors.push(`evidence[${index}] needs an evidence location or PR attachment label`)
}

if (errors.length) {
  for (const error of errors) process.stderr.write(`Visual evidence error: ${error}\n`)
  process.exit(1)
}

process.stdout.write('Visual evidence manifest is complete and marked synthetic.\n')
