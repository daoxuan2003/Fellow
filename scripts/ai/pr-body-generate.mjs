#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import {
  assertValid,
  parseArgs,
  readJson
} from './lib/work-item-utils.mjs'

const args = parseArgs(process.argv.slice(2))
const file = args.file || args._[0]
if (!file) {
  console.error('Usage: node scripts/ai/pr-body-generate.mjs --file=<work-item.json> [--output=<file>]')
  process.exit(1)
}

const item = readJson(file)
try {
  assertValid(item, { checkStageGates: item.stage === 'review_ready' })
} catch (error) {
  console.error(`Cannot generate a reliable PR body:\n${error.message}`)
  process.exit(1)
}

const bullets = values => values?.length ? values.map(value => `- ${value}`).join('\n') : '- 无'
const criteria = item.acceptanceCriteria.map(c => `- [${c.status === 'passed' ? 'x' : ' '}] ${c.text} — ${c.status}${c.evidence ? `；证据：${c.evidence}` : ''}`).join('\n')
const checks = item.validation.checks.map(check => `- ${check.status}: ${check.name}${check.command ? ` — \`${check.command}\`` : ''}${check.evidence ? `；${check.evidence}` : ''}${check.waiverReason ? `；waiver: ${check.waiverReason}` : ''}`).join('\n')

const body = `## 目标与变更\n\n${item.goal}\n\n` +
`工作项：\`${file}\`（${item.id}，状态：${item.stage}）\n\n` +
`## 关联任务\n\n${item.source.type}: ${item.source.reference}\n\n` +
`## 验收条件\n\n${criteria}\n\n` +
`## VERIFIED\n\n${bullets(item.context.verifiedFacts)}\n\n` +
`## UNKNOWN\n\n${bullets(item.context.unknowns)}\n\n` +
`## ASSUMED_FOR_TASK\n\n${bullets(item.context.assumptions)}\n\n` +
`## 范围\n\n### In scope\n${bullets(item.scope.inScope)}\n\n### Out of scope\n${bullets(item.scope.outOfScope)}\n\n` +
`## 影响与风险\n\n- Risk: ${item.risk.level}\n- Security: ${item.impact.security}\n- Data: ${item.impact.data}\n- Environment: ${item.impact.environment}\n- Design: ${item.impact.design}\n- Realtime: ${item.impact.realtime}\n- Migration: ${item.impact.migration}\n- Rollback: ${item.risk.rollback || '无 / 待说明'}\n\n` +
`## 验证证据\n\n${checks || '- 无'}\n\n` +
`## 视觉证据\n\n- Required: ${item.validation.visualEvidenceRequired}\n- Manifest: ${item.validation.visualEvidenceManifest || '不适用 / 未提供'}\n\n` +
`## AI 自检\n\n- [x] 已使用工作项阶段门禁\n- [x] 已区分事实、未知与假设\n- [x] 未在工作项或 PR 中粘贴密钥、原始隐私数据或完整生产日志\n- [x] 已记录范围、风险、验证和回滚\n- [ ] 产品负责人完成体验与风险审批\n`

if (args.output) {
  fs.mkdirSync(path.dirname(args.output), { recursive: true })
  fs.writeFileSync(args.output, body, 'utf8')
  console.log(`Wrote ${args.output}`)
} else {
  process.stdout.write(body)
}
