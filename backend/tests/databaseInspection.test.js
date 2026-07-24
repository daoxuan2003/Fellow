const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');

const repositoryRoot = resolve(__dirname, '../..');
const fixtureRoot = resolve(repositoryRoot, 'scripts/ai/fixtures/database-inspection');
const fixedNow = new Date('2026-07-24T00:00:00.000Z');

const modules = Promise.all([
  import(pathToFileURL(resolve(repositoryRoot, 'scripts/ai/lib/database-inspection-core.mjs')).href),
  import(pathToFileURL(resolve(repositoryRoot, 'scripts/ai/lib/database-inspection-contract.mjs')).href)
]);

function readFixture(name) {
  return JSON.parse(readFileSync(resolve(fixtureRoot, `${name}.json`), 'utf8'));
}

async function reportFromFixture(name) {
  const [core] = await modules;
  const fixture = readFixture(name);
  return core.inspectPostgraduateOwnership({
    adapter: core.createDatabaseInspectionFixtureAdapter(fixture),
    declaredIndexes: fixture.declaredIndexes,
    now: fixedNow
  });
}

test('empty fixture emits zero-only aggregate evidence under the strict contract', async () => {
  const report = await reportFromFixture('empty');
  const [, contract] = await modules;

  assert.deepEqual(contract.validateDatabaseInspectionReport(report), []);
  assert.equal(report.status, 'passed');
  assert.deepEqual(report.metrics.values, {
    documents: 0,
    checkInElements: 0,
    actorPresentElements: 0,
    actorMissingOrEmptyElements: 0,
    actorCoveragePercent: 0,
    duplicateActorDayElementExcess: 0,
    multiElementCoupleDayCombinations: 0
  });
  assert.equal(report.databaseCapabilities.topology, 'standalone');
  assert.equal(report.databaseCapabilities.transactionCapability, 'unsupported');
});

test('full coverage fixture reports complete actor coverage and matching redacted indexes', async () => {
  const report = await reportFromFixture('full-coverage');

  assert.equal(report.metrics.values.documents, 2);
  assert.equal(report.metrics.values.checkInElements, 3);
  assert.equal(report.metrics.values.actorPresentElements, 3);
  assert.equal(report.metrics.values.actorMissingOrEmptyElements, 0);
  assert.equal(report.metrics.values.actorCoveragePercent, 100);
  assert.equal(report.indexes.comparison.matchesDeclared, true);
  assert.deepEqual(report.indexes.declared, [{
    keys: [{ role: 'couple_scope', direction: 'ascending' }],
    unique: true,
    sparse: false
  }]);
  assert.deepEqual(report.indexes.actual, report.indexes.declared);
  assert.equal(report.databaseCapabilities.topology, 'replica_set');
  assert.equal(report.databaseCapabilities.transactionCapability, 'supported');

  const serialized = JSON.stringify(report);
  assert.doesNotMatch(
    serialized,
    /synthetic-|coupleId|userId|checkIns\.date|synthetic-primary|synthetic-scope/u
  );
});

test('partial missing fixture treats absent, empty and whitespace-only actors as missing', async () => {
  const report = await reportFromFixture('partial-missing');

  assert.equal(report.metrics.values.checkInElements, 4);
  assert.equal(report.metrics.values.actorPresentElements, 1);
  assert.equal(report.metrics.values.actorMissingOrEmptyElements, 3);
  assert.equal(report.metrics.values.actorCoveragePercent, 25);
});

test('actor duplicate fixture counts excess elements without returning duplicate keys', async () => {
  const report = await reportFromFixture('actor-duplicate');

  assert.equal(report.metrics.values.duplicateActorDayElementExcess, 2);
  assert.equal(report.metrics.values.multiElementCoupleDayCombinations, 1);
  assert.equal(report.indexes.comparison.matchesDeclared, false);
  assert.deepEqual(report.indexes.actual[0].keys, [
    { role: 'couple_scope', direction: 'ascending' },
    { role: 'checkin_day', direction: 'ascending' },
    { role: 'redacted_other', direction: 'ascending' }
  ]);
  assert.doesNotMatch(JSON.stringify(report), /privateField|synthetic-compound-sensitive-name/u);
});

test('couple/day multiple fixture distinguishes multiple actors from actor duplicates', async () => {
  const report = await reportFromFixture('couple-day-multiple');

  assert.equal(report.metrics.values.duplicateActorDayElementExcess, 0);
  assert.equal(report.metrics.values.multiElementCoupleDayCombinations, 1);
  assert.equal(report.databaseCapabilities.topology, 'unknown');
  assert.equal(report.databaseCapabilities.transactionCapability, 'unknown');
});

for (const [fixtureName, expectedStatus] of [
  ['timeout', 'timeout'],
  ['permission-denied', 'permission_denied']
]) {
  test(`${fixtureName} fixture returns allowlisted section outcomes without details`, async () => {
    const report = await reportFromFixture(fixtureName);
    const [, contract] = await modules;

    assert.equal(report.status, 'failed');
    assert.equal(report.metrics.status, expectedStatus);
    assert.equal(report.indexes.status, expectedStatus);
    assert.equal(report.databaseCapabilities.status, expectedStatus);
    assert.deepEqual(Object.keys(report.metrics), ['status']);
    assert.deepEqual(Object.keys(report.databaseCapabilities), ['status']);
    assert.deepEqual(contract.validateDatabaseInspectionReport(report), []);
    assert.doesNotMatch(JSON.stringify(report), /Mongo|EACCES|EPERM|host|URI/iu);
  });
}

test('the production pipeline uses only read-only stages and rejects write or script operators', async () => {
  const [core] = await modules;
  const pipeline = core.buildPostgraduateMetricsPipeline();

  assert.equal(core.assertReadOnlyPipeline(pipeline), true);
  assert.equal(Object.hasOwn(pipeline.at(-1), '$limit'), true);
  assert.doesNotMatch(JSON.stringify(pipeline), /\$out|\$merge|mapReduce|\$eval|\$function/iu);

  for (const unsafe of [
    [{ $out: 'synthetic-target' }],
    [{ $merge: { into: 'synthetic-target' } }],
    [{ $project: { value: { $function: { body: 'return 1', args: [], lang: 'js' } } } }],
    [{ $project: { value: { $eval: 'synthetic' } } }],
    [{ $project: { mapReduce: 1 } }]
  ]) {
    assert.throws(() => core.assertReadOnlyPipeline(unsafe), /forbidden|non-allowlisted/u);
  }
});

test('every database adapter operation receives a bounded maxTimeMS', async () => {
  const [core] = await modules;
  const calls = [];
  const adapter = {
    async aggregate(pipeline, options) {
      calls.push(['aggregate', options.maxTimeMS]);
      return [{
        documents: 0,
        checkInElements: 0,
        actorPresentElements: 0,
        duplicateActorDayElementExcess: 0,
        multiElementCoupleDayCombinations: 0
      }];
    },
    async listIndexes(options) {
      calls.push(['listIndexes', options.maxTimeMS]);
      return [];
    },
    async capabilities(options) {
      calls.push(['capabilities', options.maxTimeMS]);
      return { topology: 'unknown', transactionCapability: 'unknown' };
    }
  };

  await core.inspectPostgraduateOwnership({
    adapter,
    declaredIndexes: [],
    maxTimeMS: 50,
    totalTimeoutMS: 500,
    now: fixedNow
  });

  assert.deepEqual(calls.map(([name]) => name), ['aggregate', 'listIndexes', 'capabilities']);
  for (const [, maxTimeMS] of calls) {
    assert.ok(Number.isInteger(maxTimeMS));
    assert.ok(maxTimeMS >= 1 && maxTimeMS <= 50);
  }
});

test('the total timeout categorizes unfinished work and does not broaden access', async () => {
  const [core] = await modules;
  let nonAggregateCalls = 0;
  const report = await core.inspectPostgraduateOwnership({
    adapter: {
      async aggregate() {
        return new Promise(() => {});
      },
      async listIndexes() {
        nonAggregateCalls += 1;
        return [];
      },
      async capabilities() {
        nonAggregateCalls += 1;
        return { topology: 'unknown', transactionCapability: 'unknown' };
      }
    },
    maxTimeMS: 100,
    totalTimeoutMS: 20,
    now: fixedNow
  });

  assert.equal(report.status, 'failed');
  assert.equal(report.metrics.status, 'timeout');
  assert.equal(report.indexes.status, 'timeout');
  assert.equal(report.databaseCapabilities.status, 'timeout');
  assert.equal(nonAggregateCalls, 0);
});

test('policy and output byte limits are repository-controlled', async () => {
  const [core] = await modules;
  const policy = JSON.parse(readFileSync(
    resolve(repositoryRoot, 'scripts/ai/inspection-policy.json'),
    'utf8'
  ));
  const report = await reportFromFixture('empty');

  assert.equal(core.validateInspectionPolicy(policy), true);
  assert.equal(core.validateInspectionPolicy({ ...policy, model: 'OtherModel' }), false);
  assert.throws(
    () => core.serializeDatabaseInspectionReport(report, { maxBytes: 32 }),
    /output limit/u
  );
  assert.ok(Buffer.byteLength(core.serializeDatabaseInspectionReport(report), 'utf8') <= 16_384);
});

test('hello capability classification uses only topology, sessions and wire-version categories', async () => {
  const [core] = await modules;

  assert.deepEqual(core.classifyMongoCapabilities(null), {
    topology: 'unknown',
    transactionCapability: 'unknown'
  });
  assert.deepEqual(core.classifyMongoCapabilities({ maxWireVersion: 20 }), {
    topology: 'standalone',
    transactionCapability: 'unsupported'
  });
  assert.deepEqual(core.classifyMongoCapabilities({
    setName: 'synthetic-set',
    logicalSessionTimeoutMinutes: 30,
    maxWireVersion: 7
  }), {
    topology: 'replica_set',
    transactionCapability: 'supported'
  });
  assert.deepEqual(core.classifyMongoCapabilities({
    msg: 'isdbgrid',
    logicalSessionTimeoutMinutes: 30,
    maxWireVersion: 7
  }), {
    topology: 'sharded',
    transactionCapability: 'unsupported'
  });
});

test('report-safety-check accepts the strict report and rejects extras and non-allowlisted values', async () => {
  const report = await reportFromFixture('full-coverage');
  const directory = mkdtempSync(join(tmpdir(), 'fellow-database-report-'));
  const safePath = join(directory, 'safe.json');
  const extraPath = join(directory, 'extra.json');
  const enumPath = join(directory, 'enum.json');

  try {
    writeFileSync(safePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    writeFileSync(extraPath, `${JSON.stringify({
      ...report,
      rawDocument: { privateValue: 'synthetic-private-value' }
    }, null, 2)}\n`, 'utf8');
    const unsafeEnum = structuredClone(report);
    unsafeEnum.databaseCapabilities.topology = 'synthetic-topology';
    writeFileSync(enumPath, `${JSON.stringify(unsafeEnum, null, 2)}\n`, 'utf8');

    const safe = spawnSync(process.execPath, [
      'scripts/ai/report-safety-check.mjs',
      safePath
    ], { cwd: repositoryRoot, encoding: 'utf8' });
    assert.equal(safe.status, 0, safe.stderr);
    assert.match(safe.stdout, /safe/u);

    for (const unsafePath of [extraPath, enumPath]) {
      const unsafe = spawnSync(process.execPath, [
        'scripts/ai/report-safety-check.mjs',
        unsafePath
      ], { cwd: repositoryRoot, encoding: 'utf8' });
      assert.equal(unsafe.status, 1);
      assert.match(unsafe.stderr, /unsafe/u);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('database inspection CLI does not load dotenv or any .env file', () => {
  const source = readFileSync(resolve(repositoryRoot, 'scripts/ai/database-inspect.mjs'), 'utf8');
  assert.doesNotMatch(source, /loadBackendEnvironment|dotenv|backend[\\/]\.env/u);
});
