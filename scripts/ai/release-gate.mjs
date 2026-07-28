#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import {
  git,
  listWorkItemFiles,
  nowIso,
  parseArgs,
  readJson
} from './lib/work-item-utils.mjs'
import {
  parseReleaseWorkItemScope,
  parseReleaseScopeManifest,
  resolveReleaseScopeFile,
  summarizeReleaseWorkItems
} from './lib/release-gate-scope.mjs'

const args = parseArgs(process.argv.slice(2))
const mainRef = args.main || 'origin/main'
const developRef = args.develop || 'origin/develop'
const strict = Boolean(args.strict)
const findings = []

function finding(level, code, message, evidence = {}) {
  findings.push({ level, code, message, evidence })
}

const currentBranch = git(['branch', '--show-current'])
const headCommit = git(['rev-parse', 'HEAD'])
const status = git(['status', '--porcelain'])
if (status) finding('block', 'dirty_worktree', 'Worktree is not clean.', { changedFileCount: status.split('\n').filter(Boolean).length })
else finding('pass', 'clean_worktree', 'Worktree is clean.')

let mainOnly = null
let developOnly = null
const divergence = git(['rev-list', '--left-right', '--count', `${mainRef}...${developRef}`])
if (divergence) {
  const [left, right] = divergence.split(/\s+/).map(Number)
  mainOnly = left
  developOnly = right
  if (left > 0) finding('block', 'main_ahead_of_develop', `${mainRef} has commits absent from ${developRef}.`, { mainOnly: left, developOnly: right })
  else finding('pass', 'branch_reconciled', `${mainRef} has no unreconciled commits absent from ${developRef}.`, { mainOnly: left, developOnly: right })
  if (right === 0) finding('warn', 'no_release_delta', `${developRef} has no commits ahead of ${mainRef}.`)
} else {
  finding(strict ? 'block' : 'unknown', 'branch_divergence_unavailable', 'Could not compare release refs. Fetch remote refs and verify names.')
}

let version = null
let newestChangelogVersion = null
let buildTime = null
try {
  const versionFile = readJson('frontend_source/public/version.json')
  version = versionFile.version || null
  buildTime = versionFile.buildTime || null
  newestChangelogVersion = versionFile.changelog?.[0]?.version || null
  if (version && version === newestChangelogVersion) finding('pass', 'version_changelog_match', 'Version matches newest changelog entry.', { version, buildTime })
  else finding('block', 'version_changelog_mismatch', 'Version and newest changelog entry differ.', { version, newestChangelogVersion, buildTime })
} catch (error) {
  finding('block', 'version_file_invalid', 'Could not read application version file.', { error: error.message })
}

let workItemScope = parseReleaseWorkItemScope(args['work-item'])
if (args['scope-file'] !== undefined) {
  if (args['work-item'] !== undefined) {
    workItemScope = {
      mode: 'explicit',
      ids: [],
      errors: ['--scope-file and --work-item cannot be used together'],
      source: 'manifest'
    }
  } else {
    const resolvedScope = resolveReleaseScopeFile(args['scope-file'], version)
    if (resolvedScope.errors.length) {
      workItemScope = { mode: 'explicit', ids: [], errors: resolvedScope.errors, source: 'manifest' }
    } else {
      try {
        const scopeStat = fs.lstatSync(resolvedScope.resolvedPath)
        const scopeRootReal = fs.realpathSync(path.resolve('.ai/releases'))
        const scopeFileReal = fs.realpathSync(resolvedScope.resolvedPath)
        const realRelative = path.relative(scopeRootReal, scopeFileReal)
        if (scopeStat.isSymbolicLink() || !scopeStat.isFile() || realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
          throw new Error('unsafe release scope file')
        }
        workItemScope = {
          ...parseReleaseScopeManifest(readJson(resolvedScope.resolvedPath), version),
          manifestPath: resolvedScope.relativePath
        }
      } catch {
        workItemScope = {
          mode: 'explicit',
          ids: [],
          errors: ['release scope manifest could not be read'],
          source: 'manifest',
          manifestPath: resolvedScope.relativePath
        }
      }
    }
  }
}

const taskSummary = summarizeReleaseWorkItems(listWorkItemFiles(), workItemScope, readJson)
if (taskSummary.scopeErrors.length) {
  finding('block', 'invalid_release_scope', 'Explicit release work-item scope is invalid.', { errors: taskSummary.scopeErrors })
} else if (taskSummary.blocking.length) {
  finding('block', 'active_release_blockers', 'Active release-scoped work items are not release-ready.', { items: taskSummary.blocking })
} else {
  finding('pass', 'no_active_task_blockers', 'No considered work-item manifest is blocked, implementing, validating, or invalid.', {
    consideredTotal: taskSummary.consideredTotal,
    scope: taskSummary.scope
  })
}
if (taskSummary.scope.mode === 'explicit' && taskSummary.scope.ignoredBlockingCount > 0) {
  finding('warn', 'unscoped_active_work_items', 'Active work items outside the explicit release scope were excluded.', {
    count: taskSummary.scope.ignoredBlockingCount
  })
}

const trackedReports = git(['ls-files', '.ai-reports/**']).split('\n').filter(Boolean)
if (trackedReports.length) finding('block', 'tracked_ai_reports', 'Generated AI reports are tracked.', { count: trackedReports.length })
else finding('pass', 'reports_untracked', 'No generated AI reports are tracked.')

finding('manual', 'remote_ci', 'Remote CI status must be verified outside this local script.')
finding('manual', 'backup_readiness', 'Backup success and restore readiness require production-safe evidence.')
finding('manual', 'product_owner_approval', 'Explicit product-owner release approval is required outside this script.')

const decision = findings.some(item => item.level === 'block')
  ? 'block'
  : findings.some(item => item.level === 'unknown')
    ? (strict ? 'block' : 'unknown')
    : 'pass'

const report = {
  reportType: 'fellow-release-gate',
  containsSecrets: false,
  generatedAt: nowIso(),
  decision,
  strict,
  repository: {
    currentBranch,
    headCommit,
    mainRef,
    developRef,
    mainOnly,
    developOnly
  },
  version: { version, newestChangelogVersion, buildTime },
  workItems: taskSummary,
  findings
}

const output = args.output || ''
if (output) {
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${output}`)
}
console.log(`Release gate decision: ${decision}`)
for (const item of findings) console.log(`${item.level.toUpperCase()} ${item.code}: ${item.message}`)
process.exit(decision === 'block' ? 1 : 0)
