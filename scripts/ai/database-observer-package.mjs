#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync
} from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const repositoryRoot = resolve(import.meta.dirname, '../..')
const reportsRoot = resolve(repositoryRoot, '.ai-reports')
const defaultManifestPath = resolve(import.meta.dirname, 'database-observer-package-manifest.json')
const INTEGRITY_MEMBER = 'database-observer-integrity.json'
const PINNED_DEPENDENCY_INSTALL_PATHS = Object.freeze({
  'node_modules/ip-address': 'node_modules/database-observer-ip-address',
  'node_modules/mongoose': 'node_modules/database-observer-mongoose'
})

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

export function assertSafeRelativePath(path, label = 'path') {
  if (
    typeof path !== 'string' ||
    !path ||
    path.startsWith('/') ||
    path.includes('\\') ||
    path.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error(`${label} must be a safe relative path`)
  }
}

function assertArtifactName(name) {
  if (typeof name !== 'string' || !/^[A-Za-z0-9._-]+$/u.test(name)) {
    throw new Error('artifact name must not contain a path')
  }
}

function parseArguments(argv) {
  const parsed = { output: '', verifyOnly: false }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--verify-only') {
      parsed.verifyOnly = true
      continue
    }
    if (value.startsWith('--output=')) {
      parsed.output = value.slice('--output='.length)
      continue
    }
    if (value === '--output' && argv[index + 1]) {
      parsed.output = argv[index + 1]
      index += 1
      continue
    }
    throw new Error(`unsupported argument: ${value}`)
  }
  if (!parsed.verifyOnly && !parsed.output) throw new Error('--output is required unless --verify-only is used')
  return parsed
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: repositoryRoot,
    encoding: null,
    timeout: 20_000,
    killSignal: 'SIGKILL',
    maxBuffer: 32 * 1024 * 1024,
    shell: false,
    windowsHide: true
  })
  if (result.error || result.signal || result.status !== 0) throw new Error('git command failed')
  return result.stdout
}

function runGitOptional(args) {
  try {
    return runGit(args)
  } catch {
    return null
  }
}

function readIndexedFile(path, { fallbackToWorktree = false } = {}) {
  const indexed = runGitOptional(['show', `:${path}`])
  if (indexed !== null) return indexed
  if (fallbackToWorktree) return readFileSync(resolve(repositoryRoot, path))
  throw new Error(`required indexed file is unavailable: ${path}`)
}

function writeTarString(header, offset, length, value) {
  const encoded = Buffer.from(value, 'utf8')
  if (encoded.length > length) throw new Error('tar header value is too long')
  encoded.copy(header, offset)
}

function writeTarOctal(header, offset, length, value) {
  const encoded = value.toString(8).padStart(length - 1, '0')
  if (encoded.length >= length) throw new Error('tar numeric field overflow')
  writeTarString(header, offset, length, `${encoded}\0`)
}

function writeTarPath(header, path) {
  const encoded = Buffer.from(path, 'utf8')
  if (encoded.length <= 100) {
    writeTarString(header, 0, 100, path)
    return
  }

  const separators = [...path.matchAll(/\//gu)].map((match) => match.index)
  for (let index = separators.length - 1; index >= 0; index -= 1) {
    const split = separators[index]
    const prefix = path.slice(0, split)
    const name = path.slice(split + 1)
    if (Buffer.byteLength(prefix, 'utf8') <= 155 && Buffer.byteLength(name, 'utf8') <= 100) {
      writeTarString(header, 0, 100, name)
      writeTarString(header, 345, 155, prefix)
      return
    }
  }
  throw new Error('tar path is too long')
}

export function createDeterministicTar(entries, prefix) {
  if (typeof prefix !== 'string' || !prefix.endsWith('/')) throw new Error('invalid archive prefix')
  assertSafeRelativePath(prefix.slice(0, -1), 'archive prefix')
  const chunks = []
  const seen = new Set()
  for (const entry of [...entries].sort((left, right) => (
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0
  ))) {
    assertSafeRelativePath(entry.path, 'archive entry')
    if (!Buffer.isBuffer(entry.buffer)) throw new Error('archive entry must be a buffer')
    if (seen.has(entry.path)) throw new Error('duplicate archive entry')
    seen.add(entry.path)
    const name = `${prefix}${entry.path}`
    const header = Buffer.alloc(512)
    writeTarPath(header, name)
    writeTarOctal(header, 100, 8, 0o444)
    writeTarOctal(header, 108, 8, 0)
    writeTarOctal(header, 116, 8, 0)
    writeTarOctal(header, 124, 12, entry.buffer.length)
    writeTarOctal(header, 136, 12, 0)
    header.fill(0x20, 148, 156)
    writeTarString(header, 156, 1, '0')
    writeTarString(header, 257, 6, 'ustar\0')
    writeTarString(header, 263, 2, '00')
    writeTarString(header, 265, 32, 'root')
    writeTarString(header, 297, 32, 'root')
    writeTarOctal(header, 329, 8, 0)
    writeTarOctal(header, 337, 8, 0)
    const checksum = [...header].reduce((sum, byte) => sum + byte, 0)
    writeTarString(header, 148, 8, `${checksum.toString(8).padStart(6, '0')}\0 `)
    chunks.push(header, entry.buffer)
    const remainder = entry.buffer.length % 512
    if (remainder !== 0) chunks.push(Buffer.alloc(512 - remainder))
  }
  chunks.push(Buffer.alloc(1024))
  return Buffer.concat(chunks)
}

function assertArtifact(buffer, expected, label) {
  if (buffer.length !== expected.bytes) throw new Error(`${label} byte length mismatch`)
  const actualHash = sha256(buffer)
  if (actualHash !== expected.sha256) throw new Error(`${label} SHA-256 mismatch`)
  return { bytes: buffer.length, sha256: actualHash }
}

function resolveLockedDependency(packages, packagePath, dependencyName) {
  let current = packagePath
  while (current) {
    const nested = `${current}/node_modules/${dependencyName}`
    if (packages[nested]) return nested
    const boundary = current.lastIndexOf('/node_modules/')
    current = boundary === -1 ? '' : current.slice(0, boundary)
  }
  const topLevel = `node_modules/${dependencyName}`
  return packages[topLevel] ? topLevel : null
}

export function deriveDependencyClosure(lock, rootPackagePath = 'node_modules/mongoose') {
  const packages = lock?.packages
  if (!packages || lock.lockfileVersion !== 3) throw new Error('unsupported dependency lock')
  const seen = new Set()
  const visit = (packagePath) => {
    if (seen.has(packagePath)) return
    const descriptor = packages[packagePath]
    if (!descriptor?.version || !descriptor?.integrity) throw new Error('incomplete locked dependency')
    seen.add(packagePath)
    const dependencies = { ...descriptor.dependencies, ...descriptor.optionalDependencies }
    for (const dependencyName of Object.keys(dependencies).sort()) {
      const resolvedPath = resolveLockedDependency(packages, packagePath, dependencyName)
      if (resolvedPath) visit(resolvedPath)
    }
  }
  visit(rootPackagePath)
  return [...seen].sort().map((path) => ({
    path,
    version: packages[path].version,
    integrity: packages[path].integrity
  }))
}

function walkRegularFiles(directory, relativeDirectory = '') {
  const entries = []
  const stat = lstatSync(directory)
  if (!stat.isDirectory() || stat.isSymbolicLink() || realpathSync(directory) !== resolve(directory)) {
    throw new Error('dependency package directory is unsafe')
  }
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    if (item.name === 'node_modules' && item.isDirectory()) continue
    const absolutePath = join(directory, item.name)
    const relativePath = relativeDirectory ? `${relativeDirectory}/${item.name}` : item.name
    const itemStat = lstatSync(absolutePath)
    assertRegularDependencyEntry(itemStat)
    if (itemStat.isDirectory()) {
      entries.push(...walkRegularFiles(absolutePath, relativePath))
      continue
    }
    entries.push({ path: relativePath, buffer: readFileSync(absolutePath) })
  }
  return entries
}

export function assertRegularDependencyEntry(stat) {
  if (stat.isSymbolicLink()) throw new Error('dependency link is forbidden')
  if (stat.isDirectory()) return true
  if (!stat.isFile()) throw new Error('dependency special file is forbidden')
  if (stat.nlink !== 1) throw new Error('dependency link is forbidden')
  return true
}

function collectDependencyEntries(dependencyPackages) {
  const entries = []
  for (const dependency of dependencyPackages) {
    assertSafeRelativePath(dependency.path, 'dependency package path')
    const installedPath = PINNED_DEPENDENCY_INSTALL_PATHS[dependency.path] || dependency.path
    assertSafeRelativePath(installedPath, 'installed dependency package path')
    const packageDirectory = resolve(repositoryRoot, 'backend', installedPath.replaceAll('/', sep))
    const packageJsonPath = join(packageDirectory, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    if (packageJson.version !== dependency.version) throw new Error('installed dependency version mismatch')
    for (const file of walkRegularFiles(packageDirectory)) {
      entries.push({
        path: `backend/${dependency.path}/${file.path}`,
        buffer: file.buffer
      })
    }
  }
  return entries
}

function assertOutputDirectory(output) {
  const outputDirectory = resolve(repositoryRoot, output)
  const relativePath = relative(reportsRoot, outputDirectory)
  if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('output must be a new child directory under .ai-reports')
  }
  return outputDirectory
}

function artifactSource(manifest, key) {
  const artifact = manifest.artifacts?.[key]
  assertArtifactName(artifact?.artifactName)
  assertSafeRelativePath(artifact?.sourcePath, `${key} source`)
  return readIndexedFile(artifact.sourcePath, { fallbackToWorktree: true })
}

function integrityMembers(entries, packageRoot) {
  return [...entries]
    .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0))
    .map((entry) => ({
      path: entry.path,
      bytes: entry.buffer.length,
      sha256: sha256(entry.buffer),
      owner: 'root:root',
      mode: '0444',
      installPath: `${packageRoot}/${entry.path}`
    }))
}

export async function collectDatabaseObserverPackage(manifestPath = defaultManifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (manifest.schemaVersion !== 1 || manifest.containsSecrets !== false) {
    throw new Error('unsupported database observer manifest')
  }
  if (!/^[0-9a-f]{40}$/u.test(manifest.source?.commit || '')) throw new Error('invalid source commit')
  if (!Array.isArray(manifest.source?.payloadFiles) || manifest.source.payloadFiles.length !== 10) {
    throw new Error('database source payload must contain exactly ten files')
  }
  if (!Array.isArray(manifest.source?.dependencyPackages) || manifest.source.dependencyPackages.length < 1) {
    throw new Error('database dependency closure is missing')
  }
  assertArtifactName(manifest.artifacts?.payloadArchive?.name)
  assertArtifactName(manifest.artifacts?.integrityManifest?.artifactName)

  const commitType = runGitOptional(['cat-file', '-t', manifest.source.commit])
  const commitObjectVerified = commitType?.toString('utf8').trim() === 'commit'
  if (!commitObjectVerified) throw new Error('source commit object is unavailable')

  const sourceEntries = []
  const seen = new Set()
  for (const file of manifest.source.payloadFiles) {
    assertSafeRelativePath(file.path, 'database source payload')
    if (seen.has(file.path)) throw new Error('duplicate source payload path')
    seen.add(file.path)
    const committedBuffer = runGit(['show', `${manifest.source.commit}:${file.path}`])
    assertArtifact(committedBuffer, file, `source commit ${file.path}`)
    sourceEntries.push({ path: file.path, buffer: committedBuffer })
  }

  const committedLock = JSON.parse(runGit([
    'show',
    `${manifest.source.commit}:${manifest.source.dependencyLockPath}`
  ]).toString('utf8'))
  const derivedDependencies = deriveDependencyClosure(committedLock, manifest.source.dependencyRoot)
  if (JSON.stringify(derivedDependencies) !== JSON.stringify(manifest.source.dependencyPackages)) {
    throw new Error('dependency closure does not match the pinned lock')
  }
  const dependencyEntries = collectDependencyEntries(derivedDependencies)
  const payloadEntries = [...sourceEntries, ...dependencyEntries]
  const members = integrityMembers(payloadEntries, manifest.installation.packageRoot)
  const integrity = Buffer.from(`${JSON.stringify({
    schemaVersion: 1,
    containsSecrets: false,
    sourceCommit: manifest.source.commit,
    packageRoot: manifest.installation.packageRoot,
    members
  }, null, 2)}\n`, 'utf8')
  const archiveEntries = [...payloadEntries, { path: INTEGRITY_MEMBER, buffer: integrity }]
  const archive = createDeterministicTar(archiveEntries, manifest.source.archivePrefix)

  const wrapper = artifactSource(manifest, 'wrapper')
  const launcher = artifactSource(manifest, 'launcher')
  const sudoers = artifactSource(manifest, 'sudoers')
  const dispatcher = artifactSource(manifest, 'dispatcher')

  return {
    manifest,
    archive,
    integrity,
    wrapper,
    launcher,
    sudoers,
    dispatcher,
    commitObjectVerified,
    packageMembers: integrityMembers(archiveEntries, manifest.installation.packageRoot)
  }
}

export async function verifyDatabaseObserverManifest(manifestPath = defaultManifestPath) {
  const collected = await collectDatabaseObserverPackage(manifestPath)
  const { manifest, archive, integrity, wrapper, launcher, sudoers, dispatcher } = collected
  assertArtifact(archive, manifest.artifacts.payloadArchive, 'payload archive')
  assertArtifact(integrity, manifest.artifacts.integrityManifest, 'integrity manifest')
  assertArtifact(wrapper, manifest.artifacts.wrapper, 'database wrapper')
  assertArtifact(launcher, manifest.artifacts.launcher, 'database launcher')
  assertArtifact(sudoers, manifest.artifacts.sudoers, 'sudoers template')
  assertArtifact(dispatcher, {
    bytes: manifest.artifacts.dispatcher.bytes,
    sha256: manifest.artifacts.dispatcher.replacementSha256
  }, 'dispatcher replacement')
  if (!launcher.toString('utf8').startsWith('#!/usr/bin/node\n')) {
    throw new Error('launcher must use the fixed Node shebang')
  }
  if (!dispatcher.toString('utf8').startsWith('#!/bin/bash\n')) {
    throw new Error('dispatcher must use the fixed Bash shebang')
  }

  const wrapperModule = await import(
    `${pathToFileURL(resolve(repositoryRoot, manifest.artifacts.wrapper.sourcePath)).href}?verify=${Date.now()}`
  )
  if (wrapperModule.SOURCE_COMMIT !== manifest.source.commit) {
    throw new Error('wrapper source commit does not match manifest')
  }
  if (wrapperModule.INTEGRITY_MANIFEST_SHA256 !== manifest.artifacts.integrityManifest.sha256) {
    throw new Error('wrapper integrity hash does not match manifest')
  }
  const wrapperConfig = wrapperModule.INSTALL_CONFIG
  const expectedWrapperConfig = {
    packageRoot: manifest.installation.packageRoot,
    temporaryRoot: manifest.installation.temporaryRoot,
    secretPath: manifest.installation.secretPath,
    nodePath: manifest.installation.nodePath,
    inspectionTimeoutMs: manifest.installation.inspectionTimeoutMilliseconds,
    safetyTimeoutMs: manifest.installation.safetyTimeoutMilliseconds,
    maxChildOutputBytes: manifest.installation.maxChildOutputBytes,
    maxReportBytes: manifest.installation.maxReportBytes,
    maxSecretBytes: manifest.installation.maxSecretBytes
  }
  for (const [key, expected] of Object.entries(expectedWrapperConfig)) {
    if (wrapperConfig?.[key] !== expected) throw new Error(`wrapper ${key} does not match manifest`)
  }
  const launcherText = launcher.toString('utf8')
  for (const fixedValue of [
    `'${manifest.installation.overallTimeoutSeconds}s'`,
    `--nofile=${manifest.installation.resources.openFiles}`,
    `--nproc=${manifest.installation.resources.processes}`,
    `--fsize=${manifest.installation.resources.fileBytes}`,
    `--as=${manifest.installation.resources.addressSpaceBytes}`,
    `--cpu=${manifest.installation.resources.cpuSeconds}`,
    manifest.artifacts.wrapper.installPath
  ]) {
    if (!launcherText.includes(fixedValue)) throw new Error('launcher limits do not match manifest')
  }
  const sudoersText = sudoers.toString('utf8')
  const exactSudoCommand = `${manifest.artifacts.launcher.installPath} ""`
  if (!sudoersText.includes(`(${manifest.installation.runner}) NOPASSWD: ${exactSudoCommand}`)) {
    throw new Error('sudoers command does not match manifest')
  }
  const existingRuntimeDispatcher = readIndexedFile('scripts/ai/runtime-observer/fellow-observer-gate')
  if (sha256(existingRuntimeDispatcher) !== manifest.artifacts.dispatcher.currentSha256) {
    throw new Error('runtime dispatcher regression detected')
  }
  return collected
}

export async function buildDatabaseObserverPackage(output) {
  const outputDirectory = assertOutputDirectory(output)
  if (existsSync(outputDirectory)) throw new Error('refusing to reuse an existing output directory')
  const verified = await verifyDatabaseObserverManifest()
  const { manifest, archive, integrity, wrapper, launcher, sudoers, dispatcher, packageMembers } = verified
  const artifactInputs = [
    [manifest.artifacts.payloadArchive.name, archive],
    [manifest.artifacts.integrityManifest.artifactName, integrity],
    [manifest.artifacts.wrapper.artifactName, wrapper],
    [manifest.artifacts.launcher.artifactName, launcher],
    [manifest.artifacts.sudoers.artifactName, sudoers],
    [manifest.artifacts.dispatcher.artifactName, dispatcher]
  ]
  const names = [...artifactInputs.map(([name]) => name), 'artifact-manifest.json', 'SHA256SUMS']
  if (new Set(names).size !== names.length) throw new Error('duplicate artifact name')
  const targets = names.map((name) => resolve(outputDirectory, name))
  if (targets.some(existsSync)) throw new Error('refusing to overwrite an existing artifact')

  mkdirSync(outputDirectory, { recursive: true, mode: 0o700 })
  for (let index = 0; index < artifactInputs.length; index += 1) {
    writeFileSync(targets[index], artifactInputs[index][1], { mode: 0o600, flag: 'wx' })
  }
  const artifacts = artifactInputs.map(([name, buffer]) => ({
    name,
    bytes: buffer.length,
    sha256: sha256(buffer)
  }))
  const artifactManifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    containsSecrets: false,
    sourceCommit: manifest.source.commit,
    artifacts,
    packageMembers
  }
  writeFileSync(
    targets.at(-2),
    `${JSON.stringify(artifactManifest, null, 2)}\n`,
    { encoding: 'utf8', mode: 0o600, flag: 'wx' }
  )
  writeFileSync(
    targets.at(-1),
    `${artifacts.map((artifact) => `${artifact.sha256}  ${artifact.name}`).join('\n')}\n`,
    { encoding: 'utf8', mode: 0o600, flag: 'wx' }
  )
  return { outputDirectory, artifactManifest }
}

async function main() {
  try {
    const args = parseArguments(process.argv.slice(2))
    if (args.verifyOnly) {
      const { manifest, packageMembers } = await verifyDatabaseObserverManifest()
      process.stdout.write(
        `Verified database observer source commit ${manifest.source.commit} with ${packageMembers.length} members.\n`
      )
      return
    }
    const result = await buildDatabaseObserverPackage(args.output)
    const relativeOutput = relative(repositoryRoot, result.outputDirectory).replaceAll('\\', '/')
    process.stdout.write(`Wrote database observer artifacts to ${relativeOutput}.\n`)
  } catch {
    process.stderr.write('Database observer packaging failed safely.\n')
    process.exitCode = 1
  }
}

const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (import.meta.url === entryUrl) await main()
