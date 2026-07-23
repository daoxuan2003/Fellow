const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');

const repositoryRoot = resolve(__dirname, '../..');
const manifestPath = resolve(repositoryRoot, 'scripts/ai/runtime-observer-package-manifest.json');
const wrapperPath = resolve(repositoryRoot, 'scripts/ai/runtime-observer-wrapper.mjs');
const gatePath = resolve(repositoryRoot, 'scripts/ai/runtime-observer/fellow-observer-gate');
const packagerPath = resolve(repositoryRoot, 'scripts/ai/runtime-observer-package.mjs');

const modules = Promise.all([
  import(pathToFileURL(wrapperPath).href),
  import(pathToFileURL(packagerPath).href)
]);

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function writeExecutableModule(path, source) {
  writeFileSync(path, source, { encoding: 'utf8', mode: 0o700 });
}

function safeReport() {
  return {
    generatedAt: '2026-07-23T00:00:00.000Z',
    nodeVersionCategory: 'supported',
    npmAvailable: true,
    applicationDirectoryPresent: true,
    httpHealth: 'pass',
    websocketHealth: 'pass',
    port3000Listening: true,
    port3001Listening: true,
    rootDiskUsagePercent: 37,
    defaultBackupDirectoryPresent: true,
    latestDefaultBackupAgeCategory: 'fresh',
    latestDefaultBackupSizeCategory: 'medium',
    pm2Status: 'unsupported',
    nginxStatus: 'active',
    unsupportedChecks: [
      'backupIntegrity',
      'deployedCommit',
      'nginxRouting',
      'pm2Status',
      'restoreDrill',
      'storageReachability',
      'tlsCertificate'
    ]
  };
}

function syntheticWrapperFixture({ safetyExit = 0, reportDelayMs = 0 } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'fellow-runtime-wrapper-'));
  const packageRoot = join(directory, 'package');
  const temporaryRoot = join(directory, 'reports');
  const scriptsRoot = join(packageRoot, 'scripts/ai');
  const libraryRoot = join(scriptsRoot, 'lib');
  mkdirSync(libraryRoot, { recursive: true });
  mkdirSync(temporaryRoot, { recursive: true });

  const contractPath = join(libraryRoot, 'production-runtime-contract.mjs');
  const reportPath = join(scriptsRoot, 'production-runtime-report.mjs');
  const safetyPath = join(scriptsRoot, 'report-safety-check.mjs');
  writeFileSync(
    contractPath,
    readFileSync(resolve(repositoryRoot, 'scripts/ai/lib/production-runtime-contract.mjs'))
  );
  const serializedReport = JSON.stringify(safeReport());
  writeExecutableModule(reportPath, reportDelayMs > 0
    ? `setTimeout(() => process.stdout.write(${JSON.stringify(serializedReport)}), ${reportDelayMs})\n`
    : `process.stdout.write(${JSON.stringify(serializedReport)})\n`);
  writeExecutableModule(safetyPath, [
    "import { readFileSync } from 'node:fs'",
    "JSON.parse(readFileSync(process.argv[2], 'utf8'))",
    `process.exitCode = ${safetyExit}`,
    ''
  ].join('\n'));

  const payloadHashes = Object.fromEntries([contractPath, reportPath, safetyPath].map((path) => [
    path.slice(packageRoot.length + 1).replaceAll('\\', '/'),
    sha256(readFileSync(path))
  ]));

  return {
    directory,
    reportPath,
    config: {
      packageRoot,
      packageDirectories: [packageRoot, scriptsRoot, libraryRoot],
      payloadHashes,
      temporaryParent: directory,
      temporaryRoot,
      nodePath: process.execPath,
      reportPath,
      contractPath,
      safetyPath,
      reportTimeoutMs: reportDelayMs > 0 ? 25 : 2_000,
      safetyTimeoutMs: 2_000,
      maxChildOutputBytes: 128 * 1024,
      maxReportBytes: 64 * 1024,
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

test('committed manifest pins the reviewed source commit and every artifact hash', async () => {
  const [, { verifyRuntimeObserverManifest }] = await modules;
  const { manifest, archive, wrapper, dispatcher } = await verifyRuntimeObserverManifest();

  assert.equal(manifest.source.commit, 'a82ae11fb8a2428ade1f4bff0e84da40b9811067');
  assert.equal(manifest.source.payloadFiles.length, 5);
  assert.equal(sha256(archive), manifest.artifacts.payloadArchive.sha256);
  assert.equal(sha256(wrapper), manifest.artifacts.wrapper.sha256);
  assert.equal(sha256(dispatcher), manifest.artifacts.dispatcher.replacementSha256);
  assert.equal(
    manifest.artifacts.dispatcher.currentSha256,
    'e37d7cc4d7bf48553289353ff511706eb163eaa1527a449561c7c514fba8e7c0'
  );
});

test('packager writes only the allowlisted artifacts under .ai-reports', async () => {
  const [, { buildRuntimeObserverPackage }] = await modules;
  const sourceManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const relativeOutput = `.ai-reports/runtime-observer-test-${process.pid}-${Date.now()}`;
  const outputDirectory = resolve(repositoryRoot, relativeOutput);

  try {
    const { artifactManifest } = await buildRuntimeObserverPackage(relativeOutput);
    assert.deepEqual(readdirSync(outputDirectory).sort(), [
      'SHA256SUMS',
      'artifact-manifest.json',
      'fellow-observer-gate',
      'fellow-runtime-baseline-wrapper.mjs',
      'fellow-runtime-observer-a82ae11fb8a2.tar'
    ]);
    assert.equal(artifactManifest.containsSecrets, false);
    assert.equal(artifactManifest.artifacts.length, 3);

    const archiveListing = spawnSync('tar', [
      '-tf',
      resolve(outputDirectory, sourceManifest.artifacts.payloadArchive.name)
    ], { cwd: repositoryRoot, encoding: 'utf8' });
    assert.equal(archiveListing.status, 0, archiveListing.stderr);
    assert.deepEqual(
      archiveListing.stdout.trim().split(/\r?\n/u).sort(),
      sourceManifest.source.payloadFiles
        .map((file) => `${sourceManifest.source.archivePrefix}${file.path}`)
        .sort()
    );

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

test('packager rejects output outside .ai-reports', async () => {
  const [, { buildRuntimeObserverPackage }] = await modules;
  await assert.rejects(
    buildRuntimeObserverPackage('../runtime-observer-forbidden'),
    /output must be a new child directory/u
  );
});

test('packager refuses to reuse an existing output directory', async () => {
  const [, { buildRuntimeObserverPackage }] = await modules;
  const relativeOutput = `.ai-reports/runtime-observer-existing-${process.pid}-${Date.now()}`;
  const outputDirectory = resolve(repositoryRoot, relativeOutput);
  mkdirSync(outputDirectory, { recursive: true });
  try {
    await assert.rejects(
      buildRuntimeObserverPackage(relativeOutput),
      /refusing to reuse an existing output directory/u
    );
  } finally {
    rmSync(outputDirectory, { recursive: true, force: true });
  }
});

test('wrapper emits a synthetic report only after strict contract and safety pass', async () => {
  const [{ executeRuntimeBaseline }] = await modules;
  const fixture = syntheticWrapperFixture();
  try {
    const output = await executeRuntimeBaseline(fixture.config);
    assert.deepEqual(JSON.parse(output), safeReport());
    assert.deepEqual(readdirSync(fixture.config.temporaryRoot), []);
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test('wrapper fails closed when the safety check rejects the report', async () => {
  const [{ executeRuntimeBaseline }] = await modules;
  const fixture = syntheticWrapperFixture({ safetyExit: 1 });
  try {
    await assert.rejects(executeRuntimeBaseline(fixture.config), /failed safely/u);
    assert.deepEqual(readdirSync(fixture.config.temporaryRoot), []);
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test('wrapper fails closed when the fixed report command times out', async () => {
  const [{ executeRuntimeBaseline }] = await modules;
  const fixture = syntheticWrapperFixture({ reportDelayMs: 250 });
  try {
    await assert.rejects(executeRuntimeBaseline(fixture.config), /failed safely/u);
    assert.deepEqual(readdirSync(fixture.config.temporaryRoot), []);
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test('wrapper refuses a changed payload before execution', async () => {
  const [{ executeRuntimeBaseline }] = await modules;
  const fixture = syntheticWrapperFixture();
  try {
    writeFileSync(fixture.reportPath, 'process.stdout.write("tampered")\n', 'utf8');
    await assert.rejects(executeRuntimeBaseline(fixture.config), /failed safely/u);
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test('direct wrapper invocation rejects every argument without report output', () => {
  const result = spawnSync(process.execPath, [wrapperPath, 'unexpected'], {
    cwd: repositoryRoot,
    encoding: 'utf8'
  });
  assert.equal(result.status, 64);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /rejects arguments/u);
});

test('dispatcher keeps baseline, whoami and default denial while adding one exact command', () => {
  const source = readFileSync(gatePath, 'utf8');
  assert.match(source, /^#!\/bin\/bash\n/u);
  assert.equal((source.match(/^  runtime-baseline\)$/gmu) || []).length, 1);
  assert.doesNotMatch(source, /eval|bash\s+-c|\|/u);

  const syntax = spawnSync('bash', ['-n', gatePath], { cwd: repositoryRoot, encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);

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

  for (const command of ['', 'runtime-baseline extra', 'shell']) {
    const denied = spawnSync('bash', [gatePath], {
      cwd: repositoryRoot,
      env: { ...process.env, SSH_ORIGINAL_COMMAND: command },
      encoding: 'utf8'
    });
    assert.equal(denied.status, 126);
    assert.equal(denied.stdout, '');
    assert.match(denied.stderr, /^DENIED:/u);
  }
});
