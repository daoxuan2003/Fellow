import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(testDir, '..', '..')

async function readRepoFile(pathFromRoot) {
  return readFile(join(repoRoot, pathFromRoot), 'utf8')
}

test('frontend build output stays aligned with deploy upload path', async () => {
  const [viteConfig, deployWorkflow] = await Promise.all([
    readRepoFile('frontend_source/vite.config.js'),
    readRepoFile('.github/workflows/deploy.yml')
  ])

  assert.match(viteConfig, /outDir:\s*['"]\.\.\/frontend\/dist['"]/)
  assert.match(deployWorkflow, /cd frontend_source\s*\n\s*npm ci\s*\n\s*npm run build/)
  assert.match(deployWorkflow, /source:\s*["'][^"']*frontend\/dist[^"']*["']/)
  assert.match(deployWorkflow, /source:\s*["'][^"']*backend[^"']*["']/)
  assert.doesNotMatch(deployWorkflow, /backend\/\*/)
  assert.match(deployWorkflow, /grep -q "homeMessageChanged" backend\/routes\/user\.js/)
  assert.match(deployWorkflow, /grep -q "storagePathInput" backend\/routes\/photo\.js/)
})

test('frontend build artifacts are not tracked in git', () => {
  const trackedFiles = execFileSync('git', ['ls-files'], {
    cwd: repoRoot,
    encoding: 'utf8'
  })
    .split(/\r?\n/)
    .filter(Boolean)

  const trackedDistFiles = trackedFiles.filter((filePath) => (
    filePath.startsWith('frontend/dist/')
    || filePath.startsWith('frontend_source/dist/')
  ))

  assert.deepEqual(trackedDistFiles, [])
})
