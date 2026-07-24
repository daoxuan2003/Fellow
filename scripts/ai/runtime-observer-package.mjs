#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const repositoryRoot = resolve(import.meta.dirname, '../..')
const reportsRoot = resolve(repositoryRoot, '.ai-reports')
const defaultManifestPath = resolve(import.meta.dirname, 'runtime-observer-package-manifest.json')

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function assertSafeRelativePath(path, label) {
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
    timeout: 15_000,
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

export function createDeterministicTar(entries, prefix) {
  if (typeof prefix !== 'string' || !prefix.endsWith('/')) throw new Error('invalid archive prefix')
  assertSafeRelativePath(prefix.slice(0, -1), 'archive prefix')
  const chunks = []
  for (const entry of entries) {
    assertSafeRelativePath(entry.path, 'archive entry')
    const name = `${prefix}${entry.path}`
    const header = Buffer.alloc(512)
    writeTarString(header, 0, 100, name)
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

function assertOutputDirectory(output) {
  const outputDirectory = resolve(repositoryRoot, output)
  const relativePath = relative(reportsRoot, outputDirectory)
  if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('output must be a new child directory under .ai-reports')
  }
  return outputDirectory
}

export async function verifyRuntimeObserverManifest(manifestPath = defaultManifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (manifest.schemaVersion !== 1 || manifest.containsSecrets !== false) {
    throw new Error('unsupported runtime observer manifest')
  }
  if (!/^[0-9a-f]{40}$/u.test(manifest.source?.commit || '')) {
    throw new Error('invalid source commit')
  }
  if (!Array.isArray(manifest.source?.payloadFiles) || manifest.source.payloadFiles.length !== 5) {
    throw new Error('runtime payload must contain exactly five files')
  }
  for (const name of [
    manifest.artifacts?.payloadArchive?.name,
    manifest.artifacts?.wrapper?.artifactName,
    manifest.artifacts?.dispatcher?.artifactName
  ]) assertArtifactName(name)
  assertSafeRelativePath(manifest.artifacts.wrapper.sourcePath, 'wrapper source')
  assertSafeRelativePath(manifest.artifacts.dispatcher.sourcePath, 'dispatcher source')

  const commitType = runGitOptional(['cat-file', '-t', manifest.source.commit])
  const commitObjectVerified = commitType?.toString('utf8').trim() === 'commit'

  const seen = new Set()
  const payloadEntries = []
  for (const file of manifest.source.payloadFiles) {
    assertSafeRelativePath(file.path, 'runtime payload')
    if (seen.has(file.path)) throw new Error('duplicate runtime payload path')
    seen.add(file.path)
    const indexedBuffer = readIndexedFile(file.path)
    assertArtifact(indexedBuffer, file, `indexed ${file.path}`)
    if (commitObjectVerified) {
      const committedBuffer = runGit(['show', `${manifest.source.commit}:${file.path}`])
      assertArtifact(committedBuffer, file, `source commit ${file.path}`)
    }
    payloadEntries.push({ path: file.path, buffer: indexedBuffer })
  }

  const archive = createDeterministicTar(payloadEntries, manifest.source.archivePrefix)
  assertArtifact(archive, manifest.artifacts.payloadArchive, 'payload archive')

  const wrapper = readIndexedFile(manifest.artifacts.wrapper.sourcePath, { fallbackToWorktree: true })
  assertArtifact(wrapper, manifest.artifacts.wrapper, 'runtime wrapper')
  const dispatcher = readIndexedFile(manifest.artifacts.dispatcher.sourcePath, { fallbackToWorktree: true })
  assertArtifact(dispatcher, {
    bytes: manifest.artifacts.dispatcher.bytes,
    sha256: manifest.artifacts.dispatcher.replacementSha256
  }, 'dispatcher replacement')

  if (!dispatcher.toString('utf8').startsWith('#!/bin/bash\n')) {
    throw new Error('dispatcher must use the fixed /bin/bash shebang')
  }

  const wrapperModule = await import(
    `${pathToFileURL(resolve(repositoryRoot, manifest.artifacts.wrapper.sourcePath)).href}?verify=${Date.now()}`
  )
  if (wrapperModule.SOURCE_COMMIT !== manifest.source.commit) {
    throw new Error('wrapper source commit does not match manifest')
  }
  if (JSON.stringify(wrapperModule.PAYLOAD_HASHES) !== JSON.stringify(Object.fromEntries(
    manifest.source.payloadFiles.map((file) => [file.path, file.sha256])
  ))) {
    throw new Error('wrapper payload hashes do not match manifest')
  }

  return { manifest, archive, wrapper, dispatcher, commitObjectVerified }
}

export async function buildRuntimeObserverPackage(output) {
  const outputDirectory = assertOutputDirectory(output)
  if (existsSync(outputDirectory)) throw new Error('refusing to reuse an existing output directory')
  const verified = await verifyRuntimeObserverManifest()
  const { manifest, archive, wrapper, dispatcher, commitObjectVerified } = verified
  const artifactTargets = [
    manifest.artifacts.payloadArchive.name,
    manifest.artifacts.wrapper.artifactName,
    manifest.artifacts.dispatcher.artifactName,
    'artifact-manifest.json',
    'SHA256SUMS'
  ].map((name) => resolve(outputDirectory, name))
  if (artifactTargets.some(existsSync)) throw new Error('refusing to overwrite an existing artifact')

  mkdirSync(outputDirectory, { recursive: true, mode: 0o700 })
  writeFileSync(artifactTargets[0], archive, { mode: 0o600, flag: 'wx' })
  writeFileSync(artifactTargets[1], wrapper, { mode: 0o600, flag: 'wx' })
  writeFileSync(artifactTargets[2], dispatcher, { mode: 0o600, flag: 'wx' })

  const artifacts = [
    {
      name: manifest.artifacts.payloadArchive.name,
      bytes: archive.length,
      sha256: sha256(archive)
    },
    {
      name: manifest.artifacts.wrapper.artifactName,
      bytes: wrapper.length,
      sha256: sha256(wrapper)
    },
    {
      name: manifest.artifacts.dispatcher.artifactName,
      bytes: dispatcher.length,
      sha256: sha256(dispatcher)
    }
  ]
  const artifactManifest = {
    generatedAt: new Date().toISOString(),
    containsSecrets: false,
    sourceCommit: manifest.source.commit,
    sourceCommitObjectVerified: commitObjectVerified,
    artifacts
  }
  writeFileSync(
    artifactTargets[3],
    `${JSON.stringify(artifactManifest, null, 2)}\n`,
    { encoding: 'utf8', mode: 0o600, flag: 'wx' }
  )
  writeFileSync(
    artifactTargets[4],
    `${artifacts.map((artifact) => `${artifact.sha256}  ${artifact.name}`).join('\n')}\n`,
    { encoding: 'utf8', mode: 0o600, flag: 'wx' }
  )

  return { outputDirectory, artifactManifest }
}

async function main() {
  try {
    const args = parseArguments(process.argv.slice(2))
    if (args.verifyOnly) {
      const { manifest } = await verifyRuntimeObserverManifest()
      process.stdout.write(`Verified runtime observer source commit ${manifest.source.commit}.\n`)
      return
    }
    const result = await buildRuntimeObserverPackage(args.output)
    const relativeOutput = relative(repositoryRoot, result.outputDirectory).replaceAll('\\', '/')
    process.stdout.write(`Wrote runtime observer artifacts to ${relativeOutput}.\n`)
  } catch {
    process.stderr.write('Runtime observer packaging failed safely.\n')
    process.exitCode = 1
  }
}

const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (import.meta.url === entryUrl) await main()
