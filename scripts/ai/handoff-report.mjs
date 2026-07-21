#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import {
  currentGitState,
  parseArgs,
  readJson,
  summarizeChecks
} from './lib/work-item-utils.mjs'

const args = parseArgs(process.argv.slice(2))
const file = args.file || args._[0]
if (!file) {
  console.error('Usage: node scripts/ai/handoff-report.mjs --file=<work-item.json> --next=<action> [--output=<file>]')
  process.exit(1)
}

const item = readJson(file)
const git = currentGitState()
const checks = summarizeChecks(item.validation?.checks)
const list = values => values?.length ? values.map(value => `- ${value}`).join('\n') : '- None recorded'
const criteria = item.acceptanceCriteria?.length
  ? item.acceptanceCriteria.map(c => `- [${c.status === 'passed' ? 'x' : ' '}] ${c.id}: ${c.text} (${c.status})`).join('\n')
  : '- None recorded'

const markdown = `# AI Task Handoff — ${item.id}\n\n` +
`## Task\n\n- Title: ${item.title}\n- Source: ${item.source.type} ${item.source.reference}\n- Stage: ${item.stage}\n- Manifest: \`${file}\`\n- Branch: ${git.branch || item.git.branch || 'UNKNOWN'}\n- Last verified commit: ${git.headCommit || item.git.headCommit || 'UNKNOWN'}\n\n` +
`## Goal\n\n${item.goal}\n\n` +
`## Acceptance criteria\n\n${criteria}\n\n` +
`## Verified facts\n\n${list(item.context.verifiedFacts)}\n\n` +
`## Unknowns\n\n${list(item.context.unknowns)}\n\n` +
`## Assumptions\n\n${list(item.context.assumptions)}\n\n` +
`## Files\n\n- Manifest touched: ${item.files.touched.join(', ') || 'None recorded'}\n- Current unstaged/staged diff: ${[...new Set([...git.touchedFiles, ...git.stagedFiles])].join(', ') || 'None'}\n\n` +
`## Validation summary\n\n${Object.entries(checks).map(([status, count]) => `- ${status}: ${count}`).join('\n') || '- No checks recorded'}\n\n` +
`## Blocker\n\n${item.blocker ? `- Reason: ${item.blocker.reason}\n- Owner: ${item.blocker.owner}\n- Unblock condition: ${item.blocker.unblockCondition}` : '- None'}\n\n` +
`## Exact next action\n\n- ${args.next || 'Update the work item with one exact executable next action.'}\n`

if (args.output) {
  fs.mkdirSync(path.dirname(args.output), { recursive: true })
  fs.writeFileSync(args.output, markdown, 'utf8')
  console.log(`Wrote ${args.output}`)
} else {
  process.stdout.write(markdown)
}
