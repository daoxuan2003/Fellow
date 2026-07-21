#!/usr/bin/env node
import {
  TRANSITIONS,
  assertValid,
  currentGitState,
  nowIso,
  parseArgs,
  readJson,
  writeJsonAtomic
} from './lib/work-item-utils.mjs'

const args = parseArgs(process.argv.slice(2))
const file = args.file || args._[0]
const target = args.to
const actor = args.actor || 'codex'
const reason = args.reason || ''

if (!file || !target || !reason) {
  console.error('Usage: node scripts/ai/work-item-transition.mjs --file=<path> --to=<stage> --reason=<text> [--actor=codex]')
  process.exit(1)
}

const item = readJson(file)
const from = item.stage
if (!(TRANSITIONS[from] || []).includes(target)) {
  console.error(`Transition ${from} -> ${target} is not allowed.`)
  process.exit(1)
}

const gitState = currentGitState()
const at = nowIso()

if (target === 'blocked') {
  const owner = args.owner || ''
  const unblockCondition = args['unblock-condition'] || ''
  if (!owner || !unblockCondition) {
    console.error('blocked transition requires --owner and --unblock-condition')
    process.exit(1)
  }
  item.blocker = {
    fromStage: from,
    reason,
    owner,
    unblockCondition,
    since: at
  }
} else if (from === 'blocked') {
  item.blocker = null
}

if (target === 'cancelled') {
  item.closure = { reason, at, actor }
}

if (['implementing', 'validating', 'review_ready'].includes(target)) {
  if (gitState.branch) item.git.branch = item.git.branch || gitState.branch
}
if (['validating', 'review_ready'].includes(target)) {
  const files = [...new Set([...gitState.touchedFiles, ...gitState.stagedFiles])]
  if (files.length) item.files.touched = files
}
if (target === 'review_ready' && gitState.headCommit) item.git.headCommit = gitState.headCommit

item.stage = target
item.updatedAt = at
item.history.push({ from, to: target, at, actor, reason })

try {
  assertValid(item, { checkStageGates: true, compareGit: target === 'implementing' })
} catch (error) {
  console.error(`Transition blocked by gate:\n${error.message}`)
  process.exit(1)
}

writeJsonAtomic(file, item)
console.log(`Transitioned ${item.id}: ${from} -> ${target}`)
