#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '../..')
const args = process.argv.slice(2)
const value = (name) => args.find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1)
const output = value('--output') ?? '.ai-reports/visual-evidence.json'
const routes = (value('--routes') ?? '/home').split(',').map((item) => item.trim()).filter(Boolean)
const commitResult = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true })
const commit = commitResult.status === 0 ? commitResult.stdout.trim() : 'unknown'
const viewports = [
  { id: 'compact', width: 320, height: 568 },
  { id: 'standard', width: 375, height: 812 },
  { id: 'wide', width: 430, height: 932 }
]

const report = {
  version: '0.3.0',
  generatedAt: new Date().toISOString(),
  containsSecrets: false,
  syntheticDataConfirmed: false,
  commit,
  evidence: routes.flatMap((route) => viewports.map((viewport) => ({
    route,
    viewport,
    state: 'replace-with-tested-state',
    status: 'not-captured',
    location: '',
    notes: ''
  })))
}

const target = resolve(root, output)
mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`)
process.stdout.write(`Created ${output}. Fill it only with non-sensitive visual evidence.\n`)
