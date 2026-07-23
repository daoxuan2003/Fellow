#!/usr/bin/env node

import { probeProductionRuntime } from './lib/production-runtime-probe.mjs'

try {
  const report = await probeProductionRuntime()
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
} catch {
  process.stderr.write('Production runtime report failed safely.\n')
  process.exitCode = 1
}
