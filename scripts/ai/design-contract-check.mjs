#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const contractPath = resolve(root, 'scripts/ai/design-contract.json')

function fail(message) {
  process.stderr.write(`Design contract error: ${message}\n`)
  process.exitCode = 1
}

if (!existsSync(contractPath)) {
  fail('scripts/ai/design-contract.json is missing')
} else {
  const contract = JSON.parse(readFileSync(contractPath, 'utf8'))
  const tokenPath = resolve(root, contract.tokenFile)
  const baselinePath = resolve(root, contract.baselineRegistry)

  for (const relativePath of contract.requiredDocs ?? []) {
    if (!existsSync(resolve(root, relativePath))) fail(`missing required document: ${relativePath}`)
  }

  if (!existsSync(tokenPath)) {
    fail(`token file is missing: ${contract.tokenFile}`)
  } else {
    const css = readFileSync(tokenPath, 'utf8')
    for (const token of contract.requiredTokens ?? []) {
      const declarations = css.match(new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`, 'gu')) ?? []
      if (declarations.length !== 1) fail(`${token} must be declared exactly once; found ${declarations.length}`)
    }
  }

  if (!existsSync(baselinePath)) {
    fail(`baseline registry is missing: ${contract.baselineRegistry}`)
  } else {
    const registry = JSON.parse(readFileSync(baselinePath, 'utf8'))
    const routes = new Set((registry.baselines ?? []).flatMap((item) => item.routes ?? []))
    for (const route of contract.referenceRoutes ?? []) {
      if (!routes.has(route)) fail(`reference route is absent from baseline registry: ${route}`)
    }

    for (const item of registry.baselines ?? []) {
      if (!['pending-capture', 'approved', 'retired'].includes(item.status)) {
        fail(`invalid baseline status for ${item.id}: ${item.status}`)
      }
      if (item.status === 'approved' && !item.approvedBy) {
        fail(`approved baseline ${item.id} must record approvedBy`)
      }
    }
  }

  const mainPath = resolve(root, 'frontend_source/src/main.js')
  if (existsSync(mainPath)) {
    const main = readFileSync(mainPath, 'utf8')
    if (!main.includes("import './styles/fellow-semantic-tokens.css'")) {
      fail('main.js must import the semantic token layer')
    }
  }
}

if (!process.exitCode) process.stdout.write('Fellow design contract is structurally valid.\n')
