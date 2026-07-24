const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} = require('node:fs');
const { tmpdir } = require('node:os');
const { dirname, join, relative, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const repositoryRoot = resolve(__dirname, '../..');
const manifestPath = resolve(repositoryRoot, 'scripts/ai/database-observer-package-manifest.json');
const packagerPath = resolve(repositoryRoot, 'scripts/ai/database-observer-package.mjs');
const wrapperPath = resolve(repositoryRoot, 'scripts/ai/database-observer-wrapper.mjs');
const launcherPath = resolve(
  repositoryRoot,
  'scripts/ai/database-observer/fellow-database-baseline-launcher.mjs'
);
const gatePath = resolve(repositoryRoot, 'scripts/ai/database-observer/fellow-observer-gate');
const sudoersPath = resolve(repositoryRoot, 'scripts/ai/database-observer/fellow-database-observer-sudoers');
const runtimeManifestPath = resolve(repositoryRoot, 'scripts/ai/runtime-observer-package-manifest.json');
const runtimeGatePath = resolve(repositoryRoot, 'scripts/ai/runtime-observer/fellow-observer-gate');

const modules = Promise.all([
  import(pathToFileURL(packagerPath).href),
  import(pathToFileURL(wrapperPath).href),
  import(pathToFileURL(launcherPath).href)
]);

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function writeModule(path, source) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, source, { encoding: 'utf8', mode: 0o700 });
}

function safeDatabaseReport() {
  return {
    reportVersion: 2,
    reportType: 'fellow-postgraduate-ownership-metrics',
    generatedAt: '2026-07-24T00:00:00.000Z',
    containsSecrets: false,
    containsRawDocuments: false,
    status: 'passed',
    metrics: {
      status: 'passed',
      values: {
        documents: 2,
        checkInElements: 3,
        actorPresentElements: 3,
        actorMissingOrEmptyElements: 0,
        actorCoveragePercent: 100,
        duplicateActorDayElementExcess: 0,
        multiElementCoupleDayCombinations: 0
      }
    },
    indexes: {
      status: 'passed',
      declared: [{
        keys: [{ role: 'couple_scope', direction: 'ascending' }],
        unique: true,
        sparse: false
      }],
      actual: [{
        keys: [{ role: 'couple_scope', direction: 'ascending' }],
        unique: true,
        sparse: false
      }],
      comparison: {
        matchesDeclared: true,
        missingDeclaredCount: 0,
        unexpectedActualCount: 0
      }
    },
    databaseCapabilities: {
      status: 'passed',
      topology: 'replica_set',
      transactionCapability: 'supported'
    }
  };
}

function unavailableDatabaseReport(category = 'permission_denied') {
  return {
    reportVersion: 2,
    reportType: 'fellow-postgraduate-ownership-metrics',
    generatedAt: '2026-07-24T00:00:00.000Z',
    containsSecrets: false,
    containsRawDocuments: false,
    status: 'failed',
    metrics: { status: category },
    indexes: { status: category },
    databaseCapabilities: { status: category }
  };
}

function capabilityPermissionReport() {
  return {
    ...safeDatabaseReport(),
    status: 'partial',
    databaseCapabilities: { status: 'permission_denied' }
  };
}

function packageMembers(packageRoot, paths) {
  return paths.map((path) => {
    const buffer = readFileSync(resolve(packageRoot, path));
    return {
      path: path.replaceAll('\\', '/'),
      bytes: buffer.length,
      sha256: sha256(buffer),
      owner: 'root:root',
      mode: '0444',
      installPath: `${packageRoot}/${path.replaceAll('\\', '/')}`
    };
  }).sort((left, right) => left.path.localeCompare(right.path, 'en'));
}

function syntheticWrapperFixture({
  report = safeDatabaseReport(),
  reportExit = 0,
  reportDelayMs = 0,
  reportStderr = '',
  safetyExit = 0,
  secret = 'mongodb://synthetic-user:synthetic-password@invalid.example/synthetic\n'
} = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'fellow-database-wrapper-'));
  const packageRoot = join(directory, 'package');
  const temporaryParent = join(directory, 'state');
  const temporaryRoot = join(temporaryParent, 'database-baseline');
  const secretParent = join(directory, 'secret');
  const secretPath = join(secretParent, 'mongodb-uri');
  const reportPath = join(packageRoot, 'scripts/ai/database-inspect.mjs');
  const policyPath = join(packageRoot, 'scripts/ai/inspection-policy.json');
  const contractPath = join(packageRoot, 'scripts/ai/lib/database-inspection-contract.mjs');
  const safetyPath = join(packageRoot, 'scripts/ai/report-safety-check.mjs');
  mkdirSync(temporaryRoot, { recursive: true });
  mkdirSync(secretParent, { recursive: true });
  mkdirSync(dirname(policyPath), { recursive: true });
  mkdirSync(dirname(contractPath), { recursive: true });
  writeFileSync(secretPath, secret, { encoding: 'utf8', mode: 0o440 });
  writeFileSync(policyPath, '{}\n', 'utf8');
  writeFileSync(
    contractPath,
    readFileSync(resolve(repositoryRoot, 'scripts/ai/lib/database-inspection-contract.mjs'))
  );

  const serialized = JSON.stringify(report);
  const reportSource = [
    reportDelayMs > 0
      ? `setTimeout(() => process.stdout.write(${JSON.stringify(serialized)}), ${reportDelayMs})`
      : `process.stdout.write(${JSON.stringify(serialized)})`,
    reportStderr ? `process.stderr.write(${JSON.stringify(reportStderr)})` : '',
    `process.exitCode = ${reportExit}`,
    ''
  ].join('\n');
  writeModule(reportPath, reportSource);
  writeModule(safetyPath, [
    "import { readFileSync } from 'node:fs'",
    "const raw = readFileSync(process.argv[2], 'utf8')",
    "if (raw.includes(process.env.MONGODB_URI || '__missing__')) process.exitCode = 91",
    `else process.exitCode = ${safetyExit}`,
    ''
  ].join('\n'));

  const memberPaths = [
    relative(packageRoot, reportPath),
    relative(packageRoot, policyPath),
    relative(packageRoot, contractPath),
    relative(packageRoot, safetyPath)
  ];
  const integrity = {
    schemaVersion: 1,
    containsSecrets: false,
    sourceCommit: '5124d83f93a4faf76de6e4b629d67cdb48414a42',
    packageRoot,
    members: packageMembers(packageRoot, memberPaths)
  };
  const integrityPath = join(packageRoot, 'database-observer-integrity.json');
  writeFileSync(integrityPath, `${JSON.stringify(integrity, null, 2)}\n`, 'utf8');

  return {
    directory,
    reportPath,
    secretPath,
    config: {
      packageRoot,
      packageParents: [packageRoot],
      integrityPath,
      integritySha256: sha256(readFileSync(integrityPath)),
      temporaryParent,
      temporaryRoot,
      secretParent,
      secretPath,
      nodePath: process.execPath,
      reportPath,
      policyPath,
      contractPath,
      safetyPath,
      inspectionTimeoutMs: reportDelayMs > 0 ? 25 : 2_000,
      safetyTimeoutMs: 2_000,
      maxChildOutputBytes: 64 * 1024,
      maxReportBytes: 16 * 1024,
      maxSecretBytes: 4 * 1024,
      enforcePosixOwnership: false,
      environment: {
        PATH: process.env.PATH || '',
        HOME: '/nonexistent',
        LANG: 'C',
        LC_ALL: 'C',
        TZ: 'UTC'
      }
    }
  };
}

test('manifest pins the exact PR #23 source and deterministic standalone closure', async () => {
  const [{ verifyDatabaseObserverManifest }] = await modules;
  const result = await verifyDatabaseObserverManifest();
  const { manifest, archive, integrity, packageMembers: members } = result;

  assert.equal(manifest.source.commit, '5124d83f93a4faf76de6e4b629d67cdb48414a42');
  assert.equal(manifest.source.payloadFiles.length, 10);
  assert.equal(manifest.source.dependencyPackages.length, 25);
  assert.equal(manifest.source.dependencyPackages.find((entry) => entry.path === 'node_modules/mongoose').version, '7.8.9');
  assert.equal(manifest.source.dependencyPackages.find((entry) => entry.path === 'node_modules/mongodb').version, '5.9.2');
  assert.equal(members.length, 1092);
  assert.equal(sha256(archive), manifest.artifacts.payloadArchive.sha256);
  assert.equal(sha256(integrity), manifest.artifacts.integrityManifest.sha256);
  assert.ok(members.every((member) => member.owner === 'root:root' && member.mode === '0444'));
  assert.ok(members.every((member) => member.installPath.startsWith(manifest.installation.packageRoot)));
  assert.ok(members.every((member) => !member.path.includes('..') && !member.path.startsWith('/')));
});

test('packager is deterministic and rejects unsafe paths, links and special files', async () => {
  const [{
    assertRegularDependencyEntry,
    collectDatabaseObserverPackage,
    createDeterministicTar
  }] = await modules;
  const first = await collectDatabaseObserverPackage();
  const second = await collectDatabaseObserverPackage();
  assert.equal(sha256(first.archive), sha256(second.archive));
  assert.throws(() => createDeterministicTar([{ path: '../escape', buffer: Buffer.alloc(0) }], 'safe/'), /safe relative path/u);
  assert.throws(() => createDeterministicTar([{ path: '/absolute', buffer: Buffer.alloc(0) }], 'safe/'), /safe relative path/u);
  assert.throws(() => createDeterministicTar([
    { path: 'same', buffer: Buffer.alloc(0) },
    { path: 'same', buffer: Buffer.alloc(0) }
  ], 'safe/'), /duplicate/u);
  assert.throws(() => assertRegularDependencyEntry({
    isSymbolicLink: () => true,
    isDirectory: () => false,
    isFile: () => true,
    nlink: 1
  }), /link is forbidden/u);
  assert.throws(() => assertRegularDependencyEntry({
    isSymbolicLink: () => false,
    isDirectory: () => false,
    isFile: () => true,
    nlink: 2
  }), /link is forbidden/u);
  assert.throws(() => assertRegularDependencyEntry({
    isSymbolicLink: () => false,
    isDirectory: () => false,
    isFile: () => false,
    nlink: 1
  }), /special file is forbidden/u);
  assert.equal(assertRegularDependencyEntry({
    isSymbolicLink: () => false,
    isDirectory: () => true,
    isFile: () => false,
    nlink: 3
  }), true);
});

test('packager writes only allowlisted artifacts and a member-complete safe manifest', async () => {
  const [{ buildDatabaseObserverPackage }] = await modules;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const relativeOutput = `.ai-reports/database-observer-test-${process.pid}-${Date.now()}`;
  const outputDirectory = resolve(repositoryRoot, relativeOutput);
  try {
    const { artifactManifest } = await buildDatabaseObserverPackage(relativeOutput);
    assert.deepEqual(readdirSync(outputDirectory).sort(), [
      'SHA256SUMS',
      'artifact-manifest.json',
      'database-observer-integrity.json',
      'fellow-database-baseline-launcher.mjs',
      'fellow-database-baseline-wrapper.mjs',
      'fellow-database-observer-5124d83f93a4.tar',
      'fellow-database-observer-sudoers',
      'fellow-observer-gate'
    ]);
    assert.equal(artifactManifest.containsSecrets, false);
    assert.equal(artifactManifest.packageMembers.length, 1092);
    const listing = spawnSync('tar', [
      '-tf',
      resolve(outputDirectory, manifest.artifacts.payloadArchive.name)
    ], { cwd: repositoryRoot, encoding: 'utf8' });
    assert.equal(listing.status, 0, listing.stderr);
    assert.equal(listing.stdout.trim().split(/\r?\n/u).length, 1092);
    const safety = spawnSync(process.execPath, [
      'scripts/ai/report-safety-check.mjs',
      `${relativeOutput}/artifact-manifest.json`
    ], { cwd: repositoryRoot, encoding: 'utf8' });
    assert.equal(safety.status, 0, safety.stderr);
    assert.match(safety.stdout, /safe/u);
  } finally {
    rmSync(outputDirectory, { recursive: true, force: true });
  }
});

test('packager rejects output outside .ai-reports and existing output', async () => {
  const [{ buildDatabaseObserverPackage }] = await modules;
  await assert.rejects(buildDatabaseObserverPackage('../database-observer-forbidden'), /new child directory/u);
  const relativeOutput = `.ai-reports/database-observer-existing-${process.pid}-${Date.now()}`;
  const outputDirectory = resolve(repositoryRoot, relativeOutput);
  mkdirSync(outputDirectory, { recursive: true });
  try {
    await assert.rejects(buildDatabaseObserverPackage(relativeOutput), /refusing to reuse/u);
  } finally {
    rmSync(outputDirectory, { recursive: true, force: true });
  }
});

test('wrapper emits only a report that passes integrity, strict contract and safety', async () => {
  const [, { executeDatabaseBaseline }] = await modules;
  const fixture = syntheticWrapperFixture();
  try {
    const output = await executeDatabaseBaseline(fixture.config);
    assert.deepEqual(JSON.parse(output), safeDatabaseReport());
    assert.deepEqual(readdirSync(fixture.config.temporaryRoot), []);
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test('wrapper returns only the narrow valid partial report when hello permission is insufficient', async () => {
  const [, { executeDatabaseBaseline }] = await modules;
  const report = capabilityPermissionReport();
  const fixture = syntheticWrapperFixture({ report, reportExit: 1 });
  try {
    const output = await executeDatabaseBaseline(fixture.config);
    assert.deepEqual(JSON.parse(output), report);
    assert.deepEqual(readdirSync(fixture.config.temporaryRoot), []);
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test('wrapper couples inspector exit status to passed and narrow partial reports', async () => {
  const [, { executeDatabaseBaseline }] = await modules;
  const fixtures = [
    syntheticWrapperFixture({ report: safeDatabaseReport(), reportExit: 1 }),
    syntheticWrapperFixture({ report: capabilityPermissionReport(), reportExit: 0 })
  ];
  try {
    for (const fixture of fixtures) {
      await assert.rejects(executeDatabaseBaseline(fixture.config), /failed safely/u);
      assert.deepEqual(readdirSync(fixture.config.temporaryRoot), []);
    }
  } finally {
    for (const fixture of fixtures) rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test('wrapper rejects missing, symlinked, multiline, empty, oversized and non-MongoDB secrets', async () => {
  const [, { executeDatabaseBaseline }] = await modules;
  for (const secret of ['', 'line-one\nline-two\n', `mongodb://${'x'.repeat(5000)}`, 'https://invalid.example/db\n']) {
    const fixture = syntheticWrapperFixture({ secret });
    try {
      await assert.rejects(executeDatabaseBaseline(fixture.config), /failed safely/u);
    } finally {
      rmSync(fixture.directory, { recursive: true, force: true });
    }
  }

  const missing = syntheticWrapperFixture();
  try {
    rmSync(missing.secretPath);
    await assert.rejects(executeDatabaseBaseline(missing.config), /failed safely/u);
  } finally {
    rmSync(missing.directory, { recursive: true, force: true });
  }

  const linked = syntheticWrapperFixture();
  try {
    const target = join(linked.directory, 'secret-target');
    writeFileSync(target, 'mongodb://synthetic/linked\n', 'utf8');
    rmSync(linked.secretPath);
    try {
      symlinkSync(target, linked.secretPath, 'file');
      await assert.rejects(executeDatabaseBaseline(linked.config), /failed safely/u);
    } catch (error) {
      if (error.code !== 'EPERM') throw error;
    }
  } finally {
    rmSync(linked.directory, { recursive: true, force: true });
  }
});

test('secret file contract rejects links, wrong owner, group or mode', async () => {
  const [, {
    assertPackageFileOwnership,
    assertRootDirectoryStat,
    assertSecretFileOwnership,
    assertSecretFileType
  }] = await modules;
  const rootDirectory = {
    isDirectory: () => true,
    isSymbolicLink: () => false,
    uid: 0,
    gid: 0,
    mode: 0o40755
  };
  assert.equal(assertRootDirectoryStat(rootDirectory, true), true);
  assert.throws(
    () => assertRootDirectoryStat({ ...rootDirectory, mode: 0o40775 }, true),
    /unsafe root directory/u
  );
  assert.throws(
    () => assertRootDirectoryStat(rootDirectory, false),
    /unsafe root directory/u
  );
  const packageFile = { uid: 0, gid: 0, mode: 0o100444 };
  assert.equal(assertPackageFileOwnership(packageFile), true);
  assert.throws(
    () => assertPackageFileOwnership({ ...packageFile, mode: 0o100644 }),
    /unsafe package member ownership/u
  );
  const correct = { uid: 0, gid: 1200, mode: 0o100440 };
  assert.equal(assertSecretFileOwnership(correct, 1200), true);
  assert.throws(() => assertSecretFileOwnership({ ...correct, uid: 1000 }, 1200), /unsafe secret ownership/u);
  assert.throws(() => assertSecretFileOwnership({ ...correct, gid: 1300 }, 1200), /unsafe secret ownership/u);
  assert.throws(() => assertSecretFileOwnership({ ...correct, mode: 0o100640 }, 1200), /unsafe secret ownership/u);
  assert.throws(() => assertSecretFileType({
    isFile: () => true,
    isSymbolicLink: () => true,
    nlink: 1
  }, true), /unsafe secret file/u);
  assert.throws(() => assertSecretFileType({
    isFile: () => true,
    isSymbolicLink: () => false,
    nlink: 2
  }, true), /unsafe secret file/u);
});

test('wrapper withholds output on payload tamper, timeout, permission denial and illegal contract data', async () => {
  const [, { executeDatabaseBaseline }] = await modules;
  const fixtures = [
    syntheticWrapperFixture({ reportDelayMs: 250 }),
    syntheticWrapperFixture({ report: unavailableDatabaseReport(), reportExit: 1 }),
    syntheticWrapperFixture({ report: { ...safeDatabaseReport(), unexpected: true } }),
    syntheticWrapperFixture({ report: {
      ...safeDatabaseReport(),
      databaseCapabilities: {
        status: 'passed',
        topology: 'forbidden-topology',
        transactionCapability: 'supported'
      }
    } })
  ];
  try {
    for (const fixture of fixtures) {
      await assert.rejects(executeDatabaseBaseline(fixture.config), /failed safely/u);
      assert.deepEqual(readdirSync(fixture.config.temporaryRoot), []);
    }
  } finally {
    for (const fixture of fixtures) rmSync(fixture.directory, { recursive: true, force: true });
  }

  const tampered = syntheticWrapperFixture();
  try {
    writeFileSync(tampered.reportPath, 'process.stdout.write("tampered")\n', 'utf8');
    await assert.rejects(executeDatabaseBaseline(tampered.config), /failed safely/u);
  } finally {
    rmSync(tampered.directory, { recursive: true, force: true });
  }
});

test('wrapper blocks safety rejection, stderr leakage and cleanup failure', async () => {
  const [, { executeDatabaseBaseline }] = await modules;
  const fixtures = [
    syntheticWrapperFixture({ safetyExit: 1 }),
    syntheticWrapperFixture({ reportStderr: 'mongodb://should-never-be-forwarded' })
  ];
  try {
    for (const fixture of fixtures) {
      await assert.rejects(executeDatabaseBaseline(fixture.config), (error) => {
        assert.equal(error.message, 'database baseline failed safely');
        assert.doesNotMatch(error.message, /mongodb|synthetic-password/iu);
        return true;
      });
      assert.deepEqual(readdirSync(fixture.config.temporaryRoot), []);
    }
  } finally {
    for (const fixture of fixtures) rmSync(fixture.directory, { recursive: true, force: true });
  }

  const cleanup = syntheticWrapperFixture();
  cleanup.config.removeTemporary = () => { throw new Error('synthetic cleanup failure'); };
  try {
    await assert.rejects(executeDatabaseBaseline(cleanup.config), /failed safely/u);
  } finally {
    rmSync(cleanup.directory, { recursive: true, force: true });
  }
});

test('direct wrapper and launcher reject every argument without report output', () => {
  for (const path of [wrapperPath, launcherPath]) {
    const result = spawnSync(process.execPath, [path, 'unexpected'], {
      cwd: repositoryRoot,
      encoding: 'utf8'
    });
    assert.equal(result.status, 64);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /rejects arguments/u);
  }
});

test('launcher uses only fixed timeout, resource limits, cwd and cleared environment', async () => {
  const [, , { launchDatabaseBaseline }] = await modules;
  let observed;
  const stdout = JSON.stringify(safeDatabaseReport());
  const result = launchDatabaseBaseline({
    spawn(command, args, options) {
      observed = { command, args, options };
      return { status: 0, signal: null, error: null, stdout, stderr: '' };
    }
  });
  assert.equal(result, stdout);
  assert.equal(observed.command, '/usr/bin/timeout');
  assert.deepEqual(observed.args.slice(0, 4), ['--signal=KILL', '--kill-after=1s', '30s', '/usr/bin/prlimit']);
  assert.ok(observed.args.includes('--as=1610612736'));
  assert.equal(observed.args.at(-2), '/usr/bin/node');
  assert.equal(observed.args.at(-1), '/usr/local/libexec/fellow-database-baseline-wrapper.mjs');
  assert.equal(observed.options.cwd, '/var/lib/fellow-database-observer/database-baseline');
  assert.deepEqual(Object.keys(observed.options.env).sort(), ['HOME', 'LANG', 'LC_ALL', 'PATH', 'TZ']);
  assert.equal(observed.options.shell, false);
});

test('sudoers grants one no-argument launcher command to the fixed runner only', () => {
  const source = readFileSync(sudoersPath, 'utf8');
  assert.match(source, /^Defaults:fellow-observer env_reset$/mu);
  assert.match(source, /^Defaults:fellow-observer !setenv$/mu);
  assert.match(
    source,
    /^fellow-observer ALL=\(fellow-db-runner\) NOPASSWD: \/usr\/local\/libexec\/fellow-database-baseline-launcher\.mjs ""$/mu
  );
  assert.doesNotMatch(source, /\(ALL|ALL\)|\/usr\/bin\/node|\/bin\/sh|\/bin\/bash|mongosh|mongo\s/u);
  assert.equal(source.trim().split(/\r?\n/u).length, 4);
});

test('combined dispatcher adds only exact database-baseline and preserves all runtime behavior', () => {
  const source = readFileSync(gatePath, 'utf8');
  const runtimeSource = readFileSync(runtimeGatePath, 'utf8');
  const runtimeManifest = JSON.parse(readFileSync(runtimeManifestPath, 'utf8'));
  assert.equal(sha256(Buffer.from(runtimeSource)), runtimeManifest.artifacts.dispatcher.replacementSha256);
  assert.match(source, /^#!\/bin\/bash\n/u);
  assert.equal((source.match(/^  database-baseline\)$/gmu) || []).length, 1);
  assert.equal((source.match(/^  runtime-baseline\)$/gmu) || []).length, 1);
  assert.equal((source.match(/^  baseline\)$/gmu) || []).length, 1);
  assert.equal((source.match(/^  whoami\)$/gmu) || []).length, 1);
  assert.doesNotMatch(source, /eval|bash\s+-c|sh\s+-c|\|/u);
  const syntax = spawnSync('bash', ['-n', gatePath], { cwd: repositoryRoot, encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);

  for (const command of ['', 'database-baseline extra', ' database-baseline', 'database-baseline ', 'cat /etc/passwd', 'database-baseline|id']) {
    const denied = spawnSync('bash', [gatePath], {
      cwd: repositoryRoot,
      env: { ...process.env, SSH_ORIGINAL_COMMAND: command },
      encoding: 'utf8'
    });
    assert.equal(denied.status, 126);
    assert.equal(denied.stdout, '');
    assert.match(denied.stderr, /^DENIED:/u);
  }

  const baseline = spawnSync('bash', [gatePath], {
    cwd: repositoryRoot,
    env: { ...process.env, SSH_ORIGINAL_COMMAND: 'baseline' },
    encoding: 'utf8'
  });
  assert.equal(baseline.status, 0, baseline.stderr);
  assert.equal(baseline.stdout.split(/\r?\n/u)[0], 'SSH_OK');
  const whoami = spawnSync('bash', [gatePath], {
    cwd: repositoryRoot,
    env: { ...process.env, SSH_ORIGINAL_COMMAND: 'whoami' },
    encoding: 'utf8'
  });
  assert.equal(whoami.status, 0, whoami.stderr);
  assert.ok(whoami.stdout.trim().length > 0);
});
