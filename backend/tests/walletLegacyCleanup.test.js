const test = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const {
  LEGACY_COLLECTIONS,
  normalizeTransactionKinds,
  dropLegacyCollections,
  removeLegacyWalletData
} = require('../scripts/migrate-wallet-remove-legacy');

test('legacy cleanup uses a fixed allowlist and never includes current wallet collections', () => {
  assert.deepEqual([...LEGACY_COLLECTIONS], ['categories', 'networths', 'budgetsettings']);
  for (const currentCollection of ['accounts', 'transactions', 'debtplans', 'monthlywalletplans', 'debtpayments']) {
    assert.equal(LEGACY_COLLECTIONS.includes(currentCollection), false);
  }
  assert.equal(Object.isFrozen(LEGACY_COLLECTIONS), true);
});

test('transaction normalization only fills missing kinds using the existing type', async () => {
  let collectionName;
  let operations;
  let options;
  const db = {
    collection(name) {
      collectionName = name;
      return {
        async bulkWrite(nextOperations, nextOptions) {
          operations = nextOperations;
          options = nextOptions;
        }
      };
    }
  };

  await normalizeTransactionKinds(db);

  assert.equal(collectionName, 'transactions');
  assert.equal(options.ordered, true);
  assert.deepEqual(operations.map(operation => operation.updateMany.filter.type), [
    'income', 'expense', 'transfer'
  ]);
  assert.deepEqual(operations.map(operation => operation.updateMany.update.$set.kind), [
    'income', 'expense', 'asset_transfer'
  ]);
  for (const operation of operations) {
    assert.deepEqual(operation.updateMany.filter.$or, [
      { kind: { $exists: false } },
      { kind: null }
    ]);
  }
});

test('legacy collection removal drops exactly the allowlisted collections in order', async () => {
  const dropped = [];
  await dropLegacyCollections({
    async dropCollection(name) { dropped.push(name); }
  });
  assert.deepEqual(dropped, [...LEGACY_COLLECTIONS]);
});

test('legacy collection removal is idempotent when collections are already absent', async () => {
  const dropped = [];
  const db = {
    async dropCollection(name) {
      dropped.push(name);
      const error = new Error('absent');
      error.codeName = 'NamespaceNotFound';
      throw error;
    }
  };

  await dropLegacyCollections(db);
  await dropLegacyCollections(db);
  assert.deepEqual(dropped, [...LEGACY_COLLECTIONS, ...LEGACY_COLLECTIONS]);
});

test('unexpected drop failures stop cleanup instead of continuing destructively', async () => {
  const dropped = [];
  const failure = new Error('permission denied');
  await assert.rejects(
    dropLegacyCollections({
      async dropCollection(name) {
        dropped.push(name);
        if (name === 'networths') throw failure;
      }
    }),
    failure
  );
  assert.deepEqual(dropped, ['categories', 'networths']);
});

test('full cleanup normalizes retained transactions before dropping legacy collections', async () => {
  const order = [];
  const db = {
    collection(name) {
      assert.equal(name, 'transactions');
      return { async bulkWrite() { order.push('normalize'); } };
    },
    async dropCollection(name) { order.push(`drop:${name}`); }
  };

  const result = await removeLegacyWalletData(db);
  assert.deepEqual(order, [
    'normalize',
    'drop:categories',
    'drop:networths',
    'drop:budgetsettings'
  ]);
  assert.deepEqual(result, { status: 'completed' });
});

test('full cleanup rejects invalid database handles before any action', async () => {
  await assert.rejects(removeLegacyWalletData(null), /database handle/i);
  await assert.rejects(removeLegacyWalletData({ collection() {} }), /database handle/i);
});

test('deployment fails closed on backup and runs cleanup only after the new backend is online', async () => {
  const workflow = await readFile(path.join(__dirname, '../../.github/workflows/deploy.yml'), 'utf8');
  const backupIndex = workflow.indexOf('npm run backup');
  const deployIndex = workflow.indexOf('- name: Deploy to Server');
  const onlineIndex = workflow.indexOf('唯一后端进程已稳定运行本次部署版本');
  const cleanupIndex = workflow.indexOf('npm run migrate:wallet-legacy-cleanup');

  assert.ok(backupIndex > 0);
  assert.ok(deployIndex > backupIndex);
  assert.ok(onlineIndex > deployIndex);
  assert.ok(cleanupIndex > onlineIndex);
  assert.doesNotMatch(workflow, /npm run backup\s*\|\|/);
});

test('cleanup command never logs raw migration errors or private record details', async () => {
  const source = await readFile(path.join(__dirname, '../scripts/migrate-wallet-remove-legacy.js'), 'utf8');
  assert.doesNotMatch(source, /console\.(?:log|error)\([^)]*error|JSON\.stringify\(|countDocuments|estimatedDocumentCount/);
  assert.match(source, /Wallet legacy cleanup completed safely/);
  assert.match(source, /Wallet legacy cleanup failed safely/);
});
