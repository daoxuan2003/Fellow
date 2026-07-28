#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import {
  currentGitState,
  nowIso,
  parseArgs,
  writeJsonAtomic
} from './lib/work-item-utils.mjs'

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  console.log(`Usage:
  node scripts/ai/work-item-init.mjs \\
    --id=issue-123 \\
    --title="Task title" \\
    --source-type=github_issue \\
    --source-ref="#123" \\
    --goal="User-verifiable outcome" \\
    --base-branch=develop \\
    --branch=fix/example [--risk=low] [--visual=false]
`)
  process.exit(0)
}

const required = ['id', 'title', 'source-type', 'source-ref', 'goal']
const missing = required.filter(key => !args[key])
if (missing.length) {
  console.error(`Missing required arguments: ${missing.join(', ')}`)
  process.exit(1)
}

if (!/^(issue|task|incident|release)-[A-Za-z0-9._-]+$/.test(args.id)) {
  console.error('id must begin with issue-, task-, incident-, or release-')
  process.exit(1)
}

const output = args.output || path.join('.ai', 'tasks', `${args.id}.json`)
if (fs.existsSync(output) && !args.force) {
  console.error(`${output} already exists; use --force only after reviewing the existing work item`)
  process.exit(1)
}

const gitState = currentGitState()
const createdAt = nowIso()
const risk = args.risk || 'low'
const visual = String(args.visual || 'false').toLowerCase() === 'true'

const item = {
  schemaVersion: 1,
  id: args.id,
  title: args.title,
  source: {
    type: args['source-type'],
    reference: args['source-ref']
  },
  stage: 'intake',
  goal: args.goal,
  acceptanceCriteria: [],
  scope: {
    inScope: [],
    outOfScope: []
  },
  context: {
    verifiedFacts: [],
    unknowns: [],
    assumptions: []
  },
  impact: {
    security: 'unknown',
    data: 'unknown',
    environment: 'unknown',
    design: visual ? 'unknown' : 'none',
    realtime: 'unknown',
    migration: 'unknown',
    notes: []
  },
  risk: {
    level: risk,
    rollback: '',
    ownerApprovalRequired: risk === 'critical',
    ownerApproval: risk === 'critical' ? 'pending' : 'not_required'
  },
  git: {
    baseBranch: args['base-branch'] || 'develop',
    baseCommit: args['base-commit'] || gitState.headCommit,
    branch: args.branch || gitState.branch,
    headCommit: ''
  },
  files: {
    expected: [],
    touched: []
  },
  dependencies: [],
  validation: {
    checks: [],
    visualEvidenceRequired: visual,
    visualEvidenceManifest: ''
  },
  blocker: null,
  closure: null,
  history: [
    {
      from: null,
      to: 'intake',
      at: createdAt,
      actor: args.actor || 'codex',
      reason: 'work item initialized'
    }
  ],
  createdAt,
  updatedAt: createdAt
}

writeJsonAtomic(output, item)
console.log(`Created ${output}`)
console.log('Stage: intake. Complete scope, criteria, impacts, risk, and checks before transitioning to ready.')
