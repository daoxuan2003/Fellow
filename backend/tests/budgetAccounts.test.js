const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getAccountById,
  getTransactionAccountIds,
  loadCoupleAccountMap,
  uniqueAccountIds
} = require('../utils/budgetAccounts');

test('transaction account ids are normalized by transaction type', () => {
  assert.deepEqual(uniqueAccountIds(['acc1', 'acc1', '', null, { toString: () => 'acc2' }]), ['acc1', 'acc2']);
  assert.deepEqual(getTransactionAccountIds('expense', 'from', 'ignored'), ['from']);
  assert.deepEqual(getTransactionAccountIds('income', null, 'ignored'), []);
  assert.deepEqual(getTransactionAccountIds('transfer', 'from', 'to'), ['from', 'to']);
});

test('loadCoupleAccountMap only returns accounts inside the current couple', async () => {
  const calls = [];
  const AccountModel = {
    async find(query) {
      calls.push(query);
      return [
        { _id: { toString: () => 'owned-a' }, coupleId: 'couple-a' },
        { _id: 'owned-b', coupleId: 'couple-a' }
      ];
    }
  };

  const { accountsById, missingAccountIds } = await loadCoupleAccountMap(
    AccountModel,
    ['owned-a', 'owned-b', 'other-couple', 'owned-a'],
    'couple-a'
  );

  assert.deepEqual(calls, [
    { _id: { $in: ['owned-a', 'owned-b', 'other-couple'] }, coupleId: 'couple-a' }
  ]);
  assert.equal(getAccountById(accountsById, 'owned-a').coupleId, 'couple-a');
  assert.equal(getAccountById(accountsById, 'owned-b').coupleId, 'couple-a');
  assert.equal(getAccountById(accountsById, 'other-couple'), undefined);
  assert.deepEqual(missingAccountIds, ['other-couple']);
});
