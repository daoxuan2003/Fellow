import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

export const STAGES = [
  'intake',
  'ready',
  'implementing',
  'validating',
  'review_ready',
  'blocked',
  'cancelled'
]

export const TRANSITIONS = {
  intake: ['ready', 'blocked', 'cancelled'],
  ready: ['implementing', 'blocked', 'cancelled'],
  implementing: ['validating', 'blocked', 'cancelled'],
  validating: ['implementing', 'review_ready', 'blocked', 'cancelled'],
  review_ready: ['implementing', 'blocked', 'cancelled'],
  blocked: ['intake', 'ready', 'implementing', 'validating', 'review_ready', 'cancelled'],
  cancelled: []
}

export function nowIso() {
  return new Date().toISOString()
}

export function parseArgs(argv) {
  const args = { _: [] }
  for (const token of argv) {
    if (!token.startsWith('--')) {
      args._.push(token)
      continue
    }
    const raw = token.slice(2)
    const index = raw.indexOf('=')
    if (index === -1) args[raw] = true
    else args[raw.slice(0, index)] = raw.slice(index + 1)
  }
  return args
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

export function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temp = `${file}.tmp-${process.pid}`
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  fs.renameSync(temp, file)
}

export function git(args, { optional = true } = {}) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim()
  } catch (error) {
    if (optional) return ''
    const detail = error?.stderr?.toString?.().trim() || error.message
    throw new Error(`git ${args.join(' ')} failed: ${detail}`)
  }
}

export function currentGitState() {
  return {
    branch: git(['branch', '--show-current']),
    headCommit: git(['rev-parse', 'HEAD']),
    status: git(['status', '--short']),
    touchedFiles: git(['diff', '--name-only', 'HEAD']).split('\n').filter(Boolean),
    stagedFiles: git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean)
  }
}

function nonEmptyStrings(value) {
  return Array.isArray(value) && value.every(item => typeof item === 'string' && item.trim())
}

function add(errors, condition, message) {
  if (!condition) errors.push(message)
}

function containsSensitiveText(value) {
  const text = JSON.stringify(value)
  const patterns = [
    /mongodb(?:\+srv)?:\/\//i,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
    /(?:JWT_SECRET|S3_SECRET_KEY|VAPID_PRIVATE_KEY|SERVER_SSH_KEY)\s*[=:]\s*[^\s"']+/i
  ]
  return patterns.some(pattern => pattern.test(text))
}

export function validateWorkItem(item, { checkStageGates = true, compareGit = false } = {}) {
  const errors = []
  const warnings = []

  add(errors, item && typeof item === 'object' && !Array.isArray(item), 'work item must be an object')
  if (errors.length) return { errors, warnings }

  add(errors, item.schemaVersion === 1, 'schemaVersion must be 1')
  add(errors, /^(issue|task|incident|release)-[A-Za-z0-9._-]+$/.test(item.id || ''), 'id must use issue-/task-/incident-/release- prefix')
  add(errors, typeof item.title === 'string' && item.title.trim().length >= 3, 'title is required')
  add(errors, item.source && ['github_issue', 'user_request', 'incident', 'maintenance', 'release'].includes(item.source.type), 'source.type is invalid')
  add(errors, typeof item.source?.reference === 'string' && item.source.reference.trim(), 'source.reference is required')
  add(errors, STAGES.includes(item.stage), 'stage is invalid')
  add(errors, typeof item.goal === 'string' && item.goal.trim().length >= 5, 'goal is required')
  add(errors, Array.isArray(item.acceptanceCriteria), 'acceptanceCriteria must be an array')
  add(errors, item.scope && Array.isArray(item.scope.inScope) && Array.isArray(item.scope.outOfScope), 'scope arrays are required')
  add(errors, item.context && Array.isArray(item.context.verifiedFacts) && Array.isArray(item.context.unknowns) && Array.isArray(item.context.assumptions), 'context arrays are required')
  add(errors, item.impact && typeof item.impact === 'object', 'impact is required')
  add(errors, item.risk && ['low', 'medium', 'high', 'critical'].includes(item.risk.level), 'risk.level is invalid')
  add(errors, item.git && typeof item.git === 'object', 'git object is required')
  add(errors, item.files && Array.isArray(item.files.expected) && Array.isArray(item.files.touched), 'files arrays are required')
  add(errors, Array.isArray(item.dependencies), 'dependencies must be an array')
  add(errors, item.validation && Array.isArray(item.validation.checks), 'validation.checks must be an array')
  add(errors, Array.isArray(item.history), 'history must be an array')
  add(errors, typeof item.createdAt === 'string' && typeof item.updatedAt === 'string', 'createdAt and updatedAt are required')

  if (containsSensitiveText(item)) errors.push('work item appears to contain a secret or credential-bearing connection string')

  const criteriaIds = new Set()
  for (const criterion of item.acceptanceCriteria || []) {
    add(errors, criterion && typeof criterion === 'object', 'acceptance criterion must be an object')
    if (!criterion || typeof criterion !== 'object') continue
    add(errors, typeof criterion.id === 'string' && criterion.id.trim(), 'acceptance criterion id is required')
    add(errors, !criteriaIds.has(criterion.id), `duplicate acceptance criterion id: ${criterion.id}`)
    criteriaIds.add(criterion.id)
    add(errors, typeof criterion.text === 'string' && criterion.text.trim(), `acceptance criterion ${criterion.id || '?'} needs text`)
    add(errors, ['pending', 'passed', 'failed', 'waived'].includes(criterion.status), `acceptance criterion ${criterion.id || '?'} has invalid status`)
    if (criterion.status === 'passed' || criterion.status === 'waived') {
      add(errors, typeof criterion.evidence === 'string' && criterion.evidence.trim(), `acceptance criterion ${criterion.id || '?'} needs evidence`)
    }
  }

  for (const check of item.validation?.checks || []) {
    add(errors, typeof check.name === 'string' && check.name.trim(), 'validation check needs a name')
    add(errors, typeof check.required === 'boolean', `validation check ${check.name || '?'} needs required boolean`)
    add(errors, ['pending', 'passed', 'failed', 'not_run', 'waived'].includes(check.status), `validation check ${check.name || '?'} has invalid status`)
    if (check.status === 'passed' || check.status === 'failed') {
      add(errors, typeof check.evidence === 'string' && check.evidence.trim(), `validation check ${check.name || '?'} needs evidence`)
    }
    if (check.status === 'waived') {
      add(errors, typeof check.waiverReason === 'string' && check.waiverReason.trim(), `waived check ${check.name || '?'} needs waiverReason`)
    }
  }

  if (checkStageGates && ['ready', 'implementing', 'validating', 'review_ready'].includes(item.stage)) {
    add(errors, (item.acceptanceCriteria || []).length > 0, `${item.stage} requires acceptance criteria`)
    add(errors, nonEmptyStrings(item.scope?.inScope), `${item.stage} requires non-empty inScope`)
    add(errors, nonEmptyStrings(item.scope?.outOfScope), `${item.stage} requires non-empty outOfScope`)
    add(errors, typeof item.git?.baseBranch === 'string' && item.git.baseBranch.trim(), `${item.stage} requires git.baseBranch`)
    add(errors, typeof item.git?.baseCommit === 'string' && item.git.baseCommit.trim(), `${item.stage} requires git.baseCommit`)
    add(errors, typeof item.git?.branch === 'string' && item.git.branch.trim(), `${item.stage} requires git.branch`)
    add(errors, !['main', 'master', 'develop'].includes(item.git?.branch), `${item.stage} requires a topic branch`)
    add(errors, (item.validation?.checks || []).length > 0, `${item.stage} requires validation checks`)
    add(errors, !(item.dependencies || []).some(dep => dep.status === 'blocked'), `${item.stage} has a blocked dependency`)
    if (item.risk?.level === 'critical') {
      add(errors, item.risk.ownerApproval === 'approved', 'critical risk requires approved owner approval')
    }
  }

  if (checkStageGates && ['validating', 'review_ready'].includes(item.stage)) {
    add(errors, nonEmptyStrings(item.files?.touched), `${item.stage} requires files.touched`)
  }

  if (checkStageGates && item.stage === 'review_ready') {
    for (const criterion of item.acceptanceCriteria || []) {
      add(errors, ['passed', 'waived'].includes(criterion.status), `review_ready criterion ${criterion.id} is ${criterion.status}`)
    }
    for (const check of item.validation?.checks || []) {
      if (check.required) add(errors, ['passed', 'waived'].includes(check.status), `required check ${check.name} is ${check.status}`)
      add(errors, check.status !== 'failed', `check ${check.name} failed`)
    }
    add(errors, item.blocker === null, 'review_ready cannot have an active blocker')
    add(errors, typeof item.git?.headCommit === 'string' && item.git.headCommit.trim(), 'review_ready requires git.headCommit')
    const visualImpact = ['local', 'shared', 'material'].includes(item.impact?.design)
    if (visualImpact || item.validation?.visualEvidenceRequired) {
      add(errors, item.validation?.visualEvidenceRequired === true, 'visible design impact requires visualEvidenceRequired=true')
      add(errors, typeof item.validation?.visualEvidenceManifest === 'string' && item.validation.visualEvidenceManifest.trim(), 'review_ready visible UI work requires visual evidence manifest')
    }
    if (['medium', 'high', 'critical'].includes(item.risk?.level)) {
      add(errors, typeof item.risk?.rollback === 'string' && item.risk.rollback.trim(), `${item.risk.level} risk requires rollback description`)
    }
  }

  if (item.stage === 'blocked') {
    add(errors, item.blocker && typeof item.blocker === 'object', 'blocked stage requires blocker details')
    add(errors, typeof item.blocker?.reason === 'string' && item.blocker.reason.trim(), 'blocker reason is required')
    add(errors, typeof item.blocker?.owner === 'string' && item.blocker.owner.trim(), 'blocker owner is required')
    add(errors, typeof item.blocker?.unblockCondition === 'string' && item.blocker.unblockCondition.trim(), 'unblock condition is required')
  }

  if (item.stage === 'cancelled') {
    add(errors, item.closure && typeof item.closure.reason === 'string' && item.closure.reason.trim(), 'cancelled stage requires closure reason')
  }

  if (compareGit) {
    const state = currentGitState()
    if (item.git?.branch && state.branch && item.git.branch !== state.branch) {
      errors.push(`current branch ${state.branch} does not match work item branch ${item.git.branch}`)
    }
    if (item.stage === 'review_ready' && item.git?.headCommit && state.headCommit && item.git.headCommit !== state.headCommit) {
      warnings.push(`work item headCommit ${item.git.headCommit} differs from current HEAD ${state.headCommit}`)
    }
  }

  const materialUnknowns = (item.context?.unknowns || []).filter(entry => /^MATERIAL:/i.test(entry))
  if (materialUnknowns.length && item.stage === 'review_ready') {
    warnings.push('review_ready contains MATERIAL unknowns; PR must show explicit risk acceptance or blocker resolution')
  }

  return { errors, warnings }
}

export function assertValid(item, options = {}) {
  const result = validateWorkItem(item, options)
  if (result.errors.length) {
    const error = new Error(result.errors.map(message => `- ${message}`).join('\n'))
    error.validation = result
    throw error
  }
  return result
}

export function listWorkItemFiles(directory = '.ai/tasks') {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory)
    .filter(name => name.endsWith('.json') && name !== 'work-item.schema.json')
    .map(name => path.join(directory, name))
    .sort()
}

export function summarizeChecks(checks = []) {
  return checks.reduce((summary, check) => {
    summary[check.status] = (summary[check.status] || 0) + 1
    return summary
  }, {})
}
