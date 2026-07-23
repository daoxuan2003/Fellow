#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

const requiredFiles = [
  'AI_PROJECT_INDEX.md',
  'AGENTS.md',
  'docs/PROJECT_CONTEXT.md',
  'docs/ai/AI_TASK_PROTOCOL.md',
  'docs/ai/AI_ORCHESTRATION.md',
  'docs/ai/CODEX_RUNBOOK.md',
  'docs/project/ACTIVE_WORK.md',
  'docs/project/WORK_ITEM_LIFECYCLE.md',
  'docs/project/RELEASE_GATES.md',
  '.ai/tasks/README.md',
  '.ai/tasks/work-item.schema.json',
  'docs/operations/ENVIRONMENT_CONTRACT.md',
  'docs/operations/RUNTIME_OBSERVABILITY.md',
  'docs/operations/RUNTIME_OBSERVER_INSTALLATION.md',
  'docs/operations/PRODUCTION_CAPABILITIES.md',
  'docs/data/DATABASE_CONTRACT.md',
  'docs/data/DATABASE_INSPECTION.md',
  'docs/design/DESIGN_SYSTEM.md',
  'docs/design/DESIGN_TOKENS.md',
  'docs/design/COMPONENT_RULES.md',
  'docs/design/VISUAL_BASELINES.md',
  'docs/design/UI_ACCEPTANCE_PROTOCOL.md',
  'docs/design/LEGACY_STYLE_DEBT.md',
  'docs/design/visual-baselines.json',
  'frontend_source/src/styles/fellow-semantic-tokens.css',
  'scripts/ai/design-contract.json',
  'scripts/ai/design-contract-check.mjs',
  'scripts/ai/ui-diff-report.mjs',
  'scripts/ai/visual-evidence-template.mjs',
  'scripts/ai/visual-evidence-check.mjs',
  'scripts/ai/lib/work-item-utils.mjs',
  'scripts/ai/work-item-init.mjs',
  'scripts/ai/work-item-check.mjs',
  'scripts/ai/work-item-transition.mjs',
  'scripts/ai/handoff-report.mjs',
  'scripts/ai/pr-body-generate.mjs',
  'scripts/ai/release-gate.mjs',
  'docs/decisions/ADR-0001-ai-native-development.md',
  'docs/decisions/ADR-0002-ai-work-orchestration.md',
  'scripts/ai/environment-report.mjs',
  'scripts/ai/production-runtime-report.mjs',
  'scripts/ai/runtime-observer-package-manifest.json',
  'scripts/ai/runtime-observer-package.mjs',
  'scripts/ai/runtime-observer-wrapper.mjs',
  'scripts/ai/runtime-observer/fellow-observer-gate',
  'scripts/ai/database-inspect.mjs',
  'scripts/ai/report-safety-check.mjs',
  'scripts/ai/inspection-policy.json',
  'frontend_source/public/version.json',
  'backend/.env.example'
]

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'))
  } catch {
    return null
  }
}

function git(args) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true
  })

  return result.status === 0 ? result.stdout.trim() : null
}

function envKeys(relativePath) {
  const path = resolve(root, relativePath)
  if (!existsSync(path)) return []

  return readFileSync(path, 'utf8')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => line.slice(0, line.indexOf('=')).trim())
    .filter(Boolean)
    .sort()
}

const version = readJson('frontend_source/public/version.json')
const missingFiles = requiredFiles.filter(
  (relativePath) => !existsSync(resolve(root, relativePath))
)

const report = {
  generatedAt: new Date().toISOString(),
  reportContainsSecrets: false,
  repository: {
    branch: git(['branch', '--show-current']) ?? 'unknown',
    commit: git(['rev-parse', 'HEAD']) ?? 'unknown',
    worktreeClean: git(['status', '--porcelain']) === ''
  },
  application: {
    version: version?.version ?? 'unknown',
    buildTime: version?.buildTime ?? 'unknown'
  },
  contextContract: {
    requiredFiles: requiredFiles.length,
    missingFiles,
    complete: missingFiles.length === 0
  },
  declaredEnvironmentKeys: envKeys('backend/.env.example')
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
process.exitCode = missingFiles.length === 0 ? 0 : 1
