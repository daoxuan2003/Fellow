#!/usr/bin/env node
import {
  listWorkItemFiles,
  parseArgs,
  readJson,
  validateWorkItem
} from './lib/work-item-utils.mjs'

const args = parseArgs(process.argv.slice(2))
const files = args.all
  ? listWorkItemFiles(args.directory || '.ai/tasks')
  : args._

if (!files.length) {
  if (args['allow-none']) {
    console.log('No work-item manifests found.')
    process.exit(0)
  }
  console.error('Provide a work-item file or use --all [--allow-none].')
  process.exit(1)
}

let failed = false
for (const file of files) {
  let item
  try {
    item = readJson(file)
  } catch (error) {
    console.error(`FAIL ${file}: ${error.message}`)
    failed = true
    continue
  }

  const result = validateWorkItem(item, {
    checkStageGates: !args['schema-only'],
    compareGit: Boolean(args['compare-git'])
  })

  if (result.errors.length) {
    failed = true
    console.error(`FAIL ${file}`)
    for (const error of result.errors) console.error(`  - ${error}`)
  } else {
    console.log(`PASS ${file} (${item.stage})`)
  }
  for (const warning of result.warnings) console.warn(`  WARN: ${warning}`)
}

process.exit(failed ? 1 : 0)
