const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');

const repositoryRoot = resolve(__dirname, '../..');
const fixtureRoot = resolve(repositoryRoot, 'scripts/ai/fixtures/production-runtime');
const fixedNow = new Date('2026-07-23T00:00:00.000Z');

const modules = Promise.all([
  import(pathToFileURL(resolve(repositoryRoot, 'scripts/ai/lib/production-runtime-probe.mjs')).href),
  import(pathToFileURL(resolve(repositoryRoot, 'scripts/ai/lib/production-runtime-contract.mjs')).href)
]);

function readFixture(name) {
  return JSON.parse(readFileSync(resolve(fixtureRoot, `${name}.json`), 'utf8'));
}

async function reportFromFixture(name) {
  const [{ createFixtureAdapter, probeProductionRuntime }] = await modules;
  const fixture = readFixture(name);
  return probeProductionRuntime({ adapter: createFixtureAdapter(fixture), now: fixedNow });
}

test('pass fixture emits only allowlisted redacted fields', async () => {
  const report = await reportFromFixture('pass');
  const [, { PERMANENT_UNSUPPORTED_CHECKS, PRODUCTION_RUNTIME_FIELDS, validateProductionRuntimeReport }] = await modules;

  assert.deepEqual(Object.keys(report), PRODUCTION_RUNTIME_FIELDS);
  assert.deepEqual(validateProductionRuntimeReport(report), []);
  assert.equal(report.generatedAt, fixedNow.toISOString());
  assert.equal(report.nodeVersionCategory, 'supported');
  assert.equal(report.npmAvailable, true);
  assert.equal(report.applicationDirectoryPresent, true);
  assert.equal(report.httpHealth, 'pass');
  assert.equal(report.websocketHealth, 'pass');
  assert.equal(report.port3000Listening, true);
  assert.equal(report.port3001Listening, true);
  assert.equal(report.rootDiskUsagePercent, 37);
  assert.equal(report.defaultBackupDirectoryPresent, true);
  assert.equal(report.latestDefaultBackupAgeCategory, 'fresh');
  assert.equal(report.latestDefaultBackupSizeCategory, 'medium');
  assert.equal(report.pm2Status, 'healthy');
  assert.equal(report.nginxStatus, 'active');
  assert.deepEqual(report.unsupportedChecks, [...PERMANENT_UNSUPPORTED_CHECKS].sort());

  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /4321|synthetic-user|couple-app-backend|\/www\//u);
});

test('fail fixture preserves failure categories without raw details', async () => {
  const report = await reportFromFixture('fail');

  assert.equal(report.nodeVersionCategory, 'unsupported');
  assert.equal(report.npmAvailable, false);
  assert.equal(report.httpHealth, 'fail');
  assert.equal(report.websocketHealth, 'fail');
  assert.equal(report.port3000Listening, false);
  assert.equal(report.port3001Listening, false);
  assert.equal(report.rootDiskUsagePercent, 92);
  assert.equal(report.latestDefaultBackupAgeCategory, 'stale');
  assert.equal(report.latestDefaultBackupSizeCategory, 'large');
  assert.equal(report.pm2Status, 'degraded');
  assert.equal(report.nginxStatus, 'inactive');
  assert.doesNotMatch(JSON.stringify(report), /5001|5002|couple-backend/u);
});

test('missing fixture reports absence without inventing runtime state', async () => {
  const report = await reportFromFixture('missing');

  assert.equal(report.npmAvailable, false);
  assert.equal(report.applicationDirectoryPresent, false);
  assert.equal(report.defaultBackupDirectoryPresent, false);
  assert.equal(report.latestDefaultBackupAgeCategory, 'missing');
  assert.equal(report.latestDefaultBackupSizeCategory, 'missing');
  assert.equal(report.pm2Status, 'missing');
  assert.equal(report.nginxStatus, 'missing');
});

test('timeout fixture classifies every bounded check without throwing', async () => {
  const report = await reportFromFixture('timeout');
  const timedFields = [
    'npmAvailable',
    'applicationDirectoryPresent',
    'httpHealth',
    'websocketHealth',
    'port3000Listening',
    'port3001Listening',
    'rootDiskUsagePercent',
    'defaultBackupDirectoryPresent',
    'latestDefaultBackupAgeCategory',
    'latestDefaultBackupSizeCategory',
    'pm2Status',
    'nginxStatus'
  ];

  for (const field of timedFields) assert.equal(report[field], 'timeout');
  for (const field of timedFields) assert.ok(report.unsupportedChecks.includes(field));
});

test('permission-denied fixture does not widen privileges or leak errors', async () => {
  const report = await reportFromFixture('permission-denied');
  const permissionFields = [
    'npmAvailable',
    'applicationDirectoryPresent',
    'httpHealth',
    'websocketHealth',
    'port3000Listening',
    'port3001Listening',
    'rootDiskUsagePercent',
    'defaultBackupDirectoryPresent',
    'latestDefaultBackupAgeCategory',
    'latestDefaultBackupSizeCategory',
    'pm2Status',
    'nginxStatus'
  ];

  for (const field of permissionFields) assert.equal(report[field], 'permission_denied');
  assert.doesNotMatch(JSON.stringify(report), /EACCES|EPERM|sudo/iu);
});

test('real adapter refuses to invoke the stateful PM2 CLI', async () => {
  const [{ createRuntimeAdapter }] = await modules;
  const result = await createRuntimeAdapter().command('pm2');

  assert.deepEqual(result, { outcome: 'unsupported' });
});

test('report-safety-check accepts the strict report and rejects extra or arbitrary fields', async () => {
  const report = await reportFromFixture('pass');
  const directory = mkdtempSync(join(tmpdir(), 'fellow-runtime-report-'));
  const reportDirectory = resolve(repositoryRoot, '.ai-reports');
  const safePath = join(reportDirectory, 'production-runtime-pass.json');
  const unsafePath = join(directory, 'unsafe.json');

  try {
    mkdirSync(reportDirectory, { recursive: true });
    writeFileSync(safePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    writeFileSync(unsafePath, `${JSON.stringify({
      ...report,
      nginxStatus: 'synthetic.example.test',
      hostname: 'synthetic-host'
    }, null, 2)}\n`, 'utf8');

    const safe = spawnSync(process.execPath, [
      'scripts/ai/report-safety-check.mjs',
      safePath
    ], { cwd: repositoryRoot, encoding: 'utf8' });
    assert.equal(safe.status, 0, safe.stderr);
    assert.match(safe.stdout, /safe/u);

    const unsafe = spawnSync(process.execPath, [
      'scripts/ai/report-safety-check.mjs',
      unsafePath
    ], { cwd: repositoryRoot, encoding: 'utf8' });
    assert.equal(unsafe.status, 1);
    assert.match(unsafe.stderr, /unexpected fields|non-allowlisted/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
