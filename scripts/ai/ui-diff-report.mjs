#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '../..')
const args = process.argv.slice(2)
const argValue = (name) => args.find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1)
const strict = args.includes('--strict')
const output = argValue('--output')
let base = argValue('--base')

function git(command) {
  return spawnSync('git', command, { cwd: root, encoding: 'utf8', windowsHide: true })
}

if (!base || /^0+$/u.test(base)) {
  const fallback = git(['rev-parse', 'HEAD^'])
  base = fallback.status === 0 ? fallback.stdout.trim() : null
}

const diffArgs = ['diff', '--unified=0']
if (base) diffArgs.push(base, '--')
else diffArgs.push('--')
diffArgs.push('frontend_source')
const diffResult = git(diffArgs)

if (diffResult.status !== 0) {
  process.stderr.write(diffResult.stderr || 'Unable to inspect frontend diff.\n')
  process.exit(1)
}

let currentFile = ''
const findings = []
const allowedRawColorFiles = new Set(['frontend_source/src/styles/fellow-semantic-tokens.css'])
const rawColor = /(?:#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\s*\()/u

function add(severity, rule, line, detail) {
  findings.push({ severity, rule, file: currentFile, line, detail })
}

for (const rawLine of diffResult.stdout.split(/\r?\n/u)) {
  if (rawLine.startsWith('+++ b/')) {
    currentFile = rawLine.slice(6)
    continue
  }
  if (!rawLine.startsWith('+') || rawLine.startsWith('+++')) continue

  const line = rawLine.slice(1)
  if (/font-family\s*:/u.test(line) && !currentFile.endsWith('fellow-semantic-tokens.css')) {
    add('error', 'new-font-family', line, 'Use a Fellow font token instead of a local font family.')
  }
  if (/(?:outline\s*:\s*none|outline\s*:\s*0)(?:\s|;|$)/u.test(line)) {
    add('error', 'hidden-focus', line, 'Do not remove focus indication without an accessible replacement.')
  }
  const z = /z-index\s*:\s*(\d+)/u.exec(line)
  if (z && Number(z[1]) > 9999) {
    add('error', 'z-index-above-contract', line, 'Use a named layer or record an ADR.')
  }
  if (rawColor.test(line) && !allowedRawColorFiles.has(currentFile) && !line.includes('design-exception')) {
    add('warning', 'raw-color', line, 'Prefer a semantic token or document a bounded illustration exception.')
  }
  if (/transition\s*:\s*all\b/u.test(line)) {
    add('warning', 'transition-all', line, 'Name the animated properties explicitly.')
  }
  if (/!important\b/u.test(line)) {
    add('warning', 'important', line, 'Check whether specificity or component ownership should be fixed instead.')
  }
  if (/gradient\s*\(/u.test(line) && !allowedRawColorFiles.has(currentFile) && !line.includes('design-exception')) {
    add('warning', 'new-gradient', line, 'A new gradient requires comparison with the existing visual language.')
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  containsSecrets: false,
  base: base ?? 'working-tree',
  errors: findings.filter((item) => item.severity === 'error'),
  warnings: findings.filter((item) => item.severity === 'warning')
}

const serialized = `${JSON.stringify(report, null, 2)}\n`
if (output) {
  const target = resolve(root, output)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, serialized)
}
process.stdout.write(serialized)

if (strict && report.errors.length > 0) process.exitCode = 1
