const test = require('node:test')
const assert = require('node:assert/strict')
const scopeHelpers = import('../../scripts/ai/lib/release-gate-scope.mjs')

function reader(items) {
  return file => {
    const value = items[file]
    if (value instanceof Error) throw value
    return value
  }
}

test('release gate keeps the conservative all-work-items default', async () => {
  const { parseReleaseWorkItemScope, summarizeReleaseWorkItems } = await scopeHelpers
  const scope = parseReleaseWorkItemScope(undefined)
  const summary = summarizeReleaseWorkItems(
    ['ready.json', 'blocked.json', 'invalid.json'],
    scope,
    reader({
      'ready.json': { id: 'release-v8', stage: 'review_ready' },
      'blocked.json': { id: 'issue-4', stage: 'blocked' },
      'invalid.json': new Error('invalid JSON')
    })
  )

  assert.deepEqual(scope, { mode: 'all', ids: [], errors: [] })
  assert.equal(summary.consideredTotal, 3)
  assert.deepEqual(summary.blocking.map(item => item.stage), ['invalid', 'blocked'])
  assert.equal(summary.scope.excludedCount, 0)
})

test('explicit scope considers only named existing work items', async () => {
  const { parseReleaseWorkItemScope, summarizeReleaseWorkItems } = await scopeHelpers
  const scope = parseReleaseWorkItemScope('release-v8,task-gate-fix')
  const summary = summarizeReleaseWorkItems(
    ['release.json', 'fix.json', 'unrelated.json', 'invalid.json'],
    scope,
    reader({
      'release.json': { id: 'release-v8', stage: 'review_ready' },
      'fix.json': { id: 'task-gate-fix', stage: 'review_ready' },
      'unrelated.json': { id: 'issue-4', stage: 'blocked' },
      'invalid.json': new Error('invalid JSON')
    })
  )

  assert.deepEqual(summary.scope.matchedIds, ['release-v8', 'task-gate-fix'])
  assert.equal(summary.consideredTotal, 2)
  assert.equal(summary.scope.excludedCount, 2)
  assert.equal(summary.scope.ignoredBlockingCount, 2)
  assert.deepEqual(summary.scopeErrors, [])
  assert.deepEqual(summary.blocking, [])
})

test('explicit scope still blocks a selected active work item', async () => {
  const { parseReleaseWorkItemScope, summarizeReleaseWorkItems } = await scopeHelpers
  const scope = parseReleaseWorkItemScope('release-v8')
  const summary = summarizeReleaseWorkItems(
    ['release.json', 'unrelated.json'],
    scope,
    reader({
      'release.json': { id: 'release-v8', stage: 'validating' },
      'unrelated.json': { id: 'issue-4', stage: 'blocked' }
    })
  )

  assert.deepEqual(summary.blocking, [
    { id: 'release-v8', stage: 'validating', file: 'release.json' }
  ])
})

test('explicit scope fails closed for a missing or duplicated manifest ID', async () => {
  const { parseReleaseWorkItemScope, summarizeReleaseWorkItems } = await scopeHelpers
  const missing = summarizeReleaseWorkItems(
    ['other.json'],
    parseReleaseWorkItemScope('release-v8'),
    reader({ 'other.json': { id: 'release-other', stage: 'review_ready' } })
  )
  assert.deepEqual(missing.scopeErrors, ['release-scoped work item does not exist: release-v8'])

  const duplicated = summarizeReleaseWorkItems(
    ['one.json', 'two.json'],
    parseReleaseWorkItemScope('release-v8'),
    reader({
      'one.json': { id: 'release-v8', stage: 'review_ready' },
      'two.json': { id: 'release-v8', stage: 'review_ready' }
    })
  )
  assert.deepEqual(duplicated.scopeErrors, ['release-scoped work item ID is duplicated: release-v8'])
})

test('scope parser rejects empty invalid duplicate and oversized inputs without echoing invalid values', async () => {
  const { parseReleaseWorkItemScope } = await scopeHelpers
  assert.ok(parseReleaseWorkItemScope(true).errors.length)
  assert.ok(parseReleaseWorkItemScope('').errors.length)
  assert.ok(parseReleaseWorkItemScope('release-v8,').errors.length)
  const invalid = parseReleaseWorkItemScope('not-a-work-item')
  assert.ok(invalid.errors.length)
  assert.deepEqual(invalid.ids, [])
  assert.doesNotMatch(invalid.errors.join(' '), /not-a-work-item/u)
  assert.ok(parseReleaseWorkItemScope('release-v8,release-v8').errors.length)

  const oversized = Array.from({ length: 33 }, (_, index) => `task-${index}`).join(',')
  assert.ok(parseReleaseWorkItemScope(oversized).errors.length)
})
