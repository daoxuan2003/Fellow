const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { JWT_SECRET } = require('../config/auth');
const { User } = require('../models');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const walletTransactionRoutes = require('../routes/walletTransactions');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const coupleId = [userId, partnerId].sort().join('_');
const accountId = '333333333333333333333333';
const transactionId = '444444444444444444444444';

let server;
let baseUrl;
let events;
let originals;

function authHeaders() {
  const token = jwt.sign({ userId, account: 'viewer' }, JWT_SECRET, {
    algorithm: 'HS256', expiresIn: '5m'
  });
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function useUnsupportedTransactions() {
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, value: 1 });
  mongoose.startSession = async () => ({
    withTransaction: async () => {
      throw new Error('Transaction numbers are only allowed on a replica set member or mongos');
    },
    endSession: async () => {}
  });
}

function installFallbackStores({ accounts = [], failReady = false } = {}) {
  const accountRows = new Map(accounts.map(account => [String(account._id), account]));
  const transactionRows = new Map();
  const state = { transactionSaveCalls: 0, accountDeltaCalls: 0, deletedPending: 0 };

  Account.findOne = async query => {
    const account = accountRows.get(String(query._id));
    if (!account) return null;
    if (query.coupleId && query.coupleId !== account.coupleId) return null;
    if (query.userId && String(query.userId) !== String(account.userId)) return null;
    if (query.type && query.type !== account.type) return null;
    if (query.isArchived === false && account.isArchived) return null;
    return account;
  };
  Account.findOneAndUpdate = async (query, update) => {
    const account = accountRows.get(String(query._id));
    if (!account || (query.walletMutationRequestId
      && query.walletMutationRequestId !== account.walletMutationRequestId)) return null;

    if (update.$inc?.balance !== undefined) {
      const markerAllowed = !account.walletMutationRequestId
        || query.$or?.some(condition => condition.walletMutationRequestId === account.walletMutationRequestId);
      if (!markerAllowed || Number(query.balance) !== Number(account.balance)) return null;
      state.accountDeltaCalls += 1;
      account.walletMutationPreviousBalance = Number(account.balance);
      account.walletMutationPreviousUpdatedAt = account.updatedAt;
      account.walletMutationRequestId = update.$set.walletMutationRequestId;
      account.balance = Number((Number(account.balance) + Number(update.$inc.balance)).toFixed(2));
      account.updatedAt = update.$set.updatedAt;
      return account;
    }

    if (update.$set?.balance !== undefined) {
      account.balance = Number(update.$set.balance);
      account.updatedAt = update.$set.updatedAt;
    }
    if (update.$unset) {
      for (const key of Object.keys(update.$unset)) delete account[key];
    }
    return account;
  };

  Transaction.findOne = async query => transactionRows.get(String(query.requestId)) || null;
  Transaction.prototype.save = async function save() {
    if (transactionRows.has(String(this.requestId))) {
      const error = new Error('duplicate request id');
      error.code = 11000;
      throw error;
    }
    state.transactionSaveCalls += 1;
    transactionRows.set(String(this.requestId), this);
    return this;
  };
  Transaction.findOneAndUpdate = async query => {
    if (failReady) throw new Error('simulated ready write failure');
    const transaction = transactionRows.get(String(query.requestId));
    if (!transaction || transaction.mutationStatus !== query.mutationStatus) return null;
    transaction.mutationStatus = 'ready';
    return transaction;
  };
  Transaction.deleteOne = async query => {
    const transaction = transactionRows.get(String(query.requestId));
    if (!transaction || transaction.mutationStatus !== query.mutationStatus) return { deletedCount: 0 };
    transactionRows.delete(String(query.requestId));
    state.deletedPending += 1;
    return { deletedCount: 1 };
  };

  return { accountRows, transactionRows, state };
}

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    events.push({ coupleId: targetCoupleId, message });
  };
  app.use('/api/wallet', walletTransactionRoutes);
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  originals = {
    userFindById: User.findById,
    accountFindOne: Account.findOne,
    accountFindOneAndUpdate: Account.findOneAndUpdate,
    transactionFind: Transaction.find,
    transactionFindOne: Transaction.findOne,
    transactionFindOneAndUpdate: Transaction.findOneAndUpdate,
    transactionDeleteOne: Transaction.deleteOne,
    transactionSave: Transaction.prototype.save,
    mongooseStartSession: mongoose.startSession,
    mongooseReadyState: mongoose.connection.readyState
  };
});

test.after(async () => {
  User.findById = originals.userFindById;
  Account.findOne = originals.accountFindOne;
  Account.findOneAndUpdate = originals.accountFindOneAndUpdate;
  Transaction.find = originals.transactionFind;
  Transaction.findOne = originals.transactionFindOne;
  Transaction.findOneAndUpdate = originals.transactionFindOneAndUpdate;
  Transaction.deleteOne = originals.transactionDeleteOne;
  Transaction.prototype.save = originals.transactionSave;
  mongoose.startSession = originals.mongooseStartSession;
  Object.defineProperty(mongoose.connection, 'readyState', {
    configurable: true,
    value: originals.mongooseReadyState
  });
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test.beforeEach(() => {
  events = [];
  mongoose.startSession = originals.mongooseStartSession;
  Object.defineProperty(mongoose.connection, 'readyState', {
    configurable: true,
    value: originals.mongooseReadyState
  });
  User.findById = async id => ({ _id: id, partnerId });
  Account.findOne = originals.accountFindOne;
  Account.findOneAndUpdate = originals.accountFindOneAndUpdate;
  Transaction.find = originals.transactionFind;
  Transaction.findOne = async () => null;
  Transaction.findOneAndUpdate = originals.transactionFindOneAndUpdate;
  Transaction.deleteOne = originals.transactionDeleteOne;
  Transaction.prototype.save = originals.transactionSave;
});

test('wallet transaction list is couple-scoped and strips internal fields', async () => {
  let findQuery;
  Transaction.find = query => {
    findQuery = query;
    return {
      sort: () => ({
        limit: () => ({
          lean: async () => [{
            _id: transactionId,
            coupleId,
            requestId: 'private-idempotency-key',
            type: 'expense',
            amount: 20,
            category: '餐饮',
            creatorId: partnerId,
            date: new Date('2026-08-25T00:00:00+08:00')
          }]
        })
      })
    };
  };

  const response = await fetch(`${baseUrl}/api/wallet/transactions`, { headers: authHeaders() });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(findQuery, { coupleId, mutationStatus: { $ne: 'pending' } });
  assert.equal(body.data[0].creatorId, partnerId);
  assert.equal(body.data[0].kind, 'expense');
  assert.equal(Object.hasOwn(body.data[0], 'coupleId'), false);
  assert.equal(Object.hasOwn(body.data[0], 'requestId'), false);
  assert.equal(Object.hasOwn(body.data[0], 'debtPlanId'), false);
  assert.equal(Object.hasOwn(body.data[0], 'installmentId'), false);
});

test('wallet transaction creation rejects another user account before writing', async () => {
  let saveCalls = 0;
  let accountQuery;
  Account.findOne = async query => {
    accountQuery = query;
    return null;
  };
  Transaction.prototype.save = async function save() {
    saveCalls += 1;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/wallet/transactions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      type: 'expense', amount: 42, category: '餐饮', accountId, date: '2026-08-25'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.message, /自己的有效账户/);
  assert.deepEqual(accountQuery, { _id: accountId, coupleId, userId, isArchived: false });
  assert.equal(saveCalls, 0);
  assert.equal(events.length, 0);
});

test('liability expense is derived as debt purchase and broadcasts only after committed writes', async () => {
  const order = [];
  const liability = {
    _id: accountId,
    userId,
    type: 'liability',
    balance: 200,
    currency: 'CNY',
    save: async () => { order.push('account-saved'); }
  };
  Account.findOne = async query => {
    assert.deepEqual(query, { _id: accountId, coupleId, userId, isArchived: false });
    return liability;
  };
  Transaction.prototype.save = async function save() {
    order.push('transaction-saved');
    return this;
  };
  events.push = function push(event) {
    order.push(`broadcast-${event.message.type}`);
    return Array.prototype.push.call(this, event);
  };

  const response = await fetch(`${baseUrl}/api/wallet/transactions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      type: 'expense', kind: 'debt_purchase', amount: 80,
      category: '购物', accountId, date: '2026-08-25'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.data.kind, 'debt_purchase');
  assert.equal(body.data.amount, 80);
  assert.equal(liability.balance, 280);
  assert.equal(Object.hasOwn(body.data, 'coupleId'), false);
  assert.deepEqual(order, [
    'transaction-saved',
    'account-saved',
    'broadcast-accountSync',
    'broadcast-walletSync'
  ]);
  assert.equal(events[1].message.data.action, 'transactionCreate');
});

test('unsupported transactions use one idempotent create and apply an account balance once', async () => {
  useUnsupportedTransactions();
  const asset = {
    _id: accountId,
    coupleId,
    userId,
    type: 'asset',
    balance: 100,
    currency: 'CNY',
    isArchived: false,
    updatedAt: new Date('2026-08-25T00:00:00Z')
  };
  const store = installFallbackStores({ accounts: [asset] });
  const payload = {
    type: 'expense', amount: 25, category: '餐饮', accountId,
    date: '2026-08-26', requestId: 'wallet-create-once'
  };

  const first = await fetch(`${baseUrl}/api/wallet/transactions`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload)
  });
  const firstBody = await first.json();
  const second = await fetch(`${baseUrl}/api/wallet/transactions`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload)
  });
  const secondBody = await second.json();

  assert.equal(first.status, 201);
  assert.equal(firstBody.replay, false);
  assert.equal(second.status, 200);
  assert.equal(secondBody.replay, true);
  assert.equal(asset.balance, 75);
  assert.equal(store.state.transactionSaveCalls, 1);
  assert.equal(store.state.accountDeltaCalls, 1);
  assert.equal(store.transactionRows.size, 1);
  assert.equal(store.transactionRows.get(payload.requestId).mutationStatus, 'ready');
  assert.equal(Object.hasOwn(firstBody.data, 'requestId'), false);
  assert.equal(Object.hasOwn(firstBody.data, 'mutationStatus'), false);
  assert.deepEqual(events.map(event => event.message.type), ['accountSync', 'walletSync']);
  assert.ok(events.every(event => event.message.data.requestId === payload.requestId));
});

test('simultaneous retries share one balance mutation and one broadcast', async () => {
  useUnsupportedTransactions();
  const asset = {
    _id: accountId, coupleId, userId, type: 'asset', balance: 100,
    currency: 'CNY', isArchived: false, updatedAt: new Date('2026-08-25T00:00:00Z')
  };
  const store = installFallbackStores({ accounts: [asset] });
  const payload = {
    type: 'expense', amount: 25, category: '餐饮', accountId,
    date: '2026-08-26', requestId: 'wallet-create-race'
  };

  const responses = await Promise.all([1, 2].map(() => fetch(`${baseUrl}/api/wallet/transactions`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload)
  })));
  const bodies = await Promise.all(responses.map(response => response.json()));

  assert.deepEqual(responses.map(response => response.status).sort(), [200, 201]);
  assert.deepEqual(bodies.map(body => body.replay).sort(), [false, true]);
  assert.equal(asset.balance, 75);
  assert.equal(store.state.transactionSaveCalls, 1);
  assert.equal(store.state.accountDeltaCalls, 1);
  assert.deepEqual(events.map(event => event.message.type), ['accountSync', 'walletSync']);
});

test('a later request repairs an orphaned account marker before applying its own delta', async () => {
  useUnsupportedTransactions();
  const asset = {
    _id: accountId, coupleId, userId, type: 'asset', balance: 75,
    currency: 'CNY', isArchived: false, updatedAt: new Date('2026-08-26T00:00:00Z'),
    walletMutationRequestId: 'orphaned-request',
    walletMutationPreviousBalance: 100,
    walletMutationPreviousUpdatedAt: new Date('2026-08-25T00:00:00Z')
  };
  const store = installFallbackStores({ accounts: [asset] });

  const response = await fetch(`${baseUrl}/api/wallet/transactions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      type: 'expense', amount: 10, category: '餐饮', accountId,
      date: '2026-08-26', requestId: 'after-orphan'
    })
  });

  assert.equal(response.status, 201);
  assert.equal(asset.balance, 90);
  assert.equal(asset.walletMutationRequestId, 'after-orphan');
  assert.equal(store.state.accountDeltaCalls, 1);
});

test('unsupported transactions can create a ledger-only row without touching an account', async () => {
  useUnsupportedTransactions();
  const store = installFallbackStores();

  const response = await fetch(`${baseUrl}/api/wallet/transactions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      type: 'expense', amount: 18, category: '餐饮', accountId: '',
      date: '2026-08-26', requestId: 'ledger-only-once'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.data.amount, 18);
  assert.equal(store.state.transactionSaveCalls, 1);
  assert.equal(store.state.accountDeltaCalls, 0);
  assert.deepEqual(events.map(event => event.message.type), ['walletSync']);
});

test('a disconnected production database still fails closed instead of starting compensation', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, value: 0 });
  let transactionQueries = 0;
  Transaction.findOne = async () => { transactionQueries += 1; return null; };
  try {
    const response = await fetch(`${baseUrl}/api/wallet/transactions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        type: 'expense', amount: 18, category: '餐饮', accountId: '',
        date: '2026-08-26', requestId: 'disconnected-write'
      })
    });
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.code, 'TRANSACTION_UNAVAILABLE');
    assert.equal(transactionQueries, 0);
    assert.equal(events.length, 0);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('unsupported transactions preserve income debt-purchase and transfer balance semantics', async () => {
  useUnsupportedTransactions();
  const incomeAccount = {
    _id: '555555555555555555555555', coupleId, userId, type: 'asset', balance: 100,
    currency: 'CNY', isArchived: false, updatedAt: new Date('2026-08-25T00:00:00Z')
  };
  const liability = {
    _id: '666666666666666666666666', coupleId, userId, type: 'liability', balance: 200,
    currency: 'CNY', isArchived: false, updatedAt: new Date('2026-08-25T00:00:00Z')
  };
  const transferTarget = {
    _id: '777777777777777777777777', coupleId, userId, type: 'asset', balance: 10,
    currency: 'CNY', isArchived: false, updatedAt: new Date('2026-08-25T00:00:00Z')
  };
  const store = installFallbackStores({ accounts: [incomeAccount, liability, transferTarget] });
  const rows = [
    { type: 'income', amount: 40, category: '工资', accountId: incomeAccount._id, date: '2026-08-26', requestId: 'income-once' },
    { type: 'expense', kind: 'debt_purchase', amount: 30, category: '购物', accountId: liability._id, date: '2026-08-26', requestId: 'debt-purchase-once' },
    { type: 'transfer', amount: 20, accountId: incomeAccount._id, toAccountId: transferTarget._id, date: '2026-08-26', requestId: 'transfer-once' }
  ];

  for (const row of rows) {
    const response = await fetch(`${baseUrl}/api/wallet/transactions`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(row)
    });
    assert.equal(response.status, 201);
  }

  assert.equal(incomeAccount.balance, 120);
  assert.equal(liability.balance, 230);
  assert.equal(transferTarget.balance, 30);
  assert.equal(store.state.transactionSaveCalls, 3);
  assert.equal(store.state.accountDeltaCalls, 4);
  assert.deepEqual(
    [...store.transactionRows.values()].map(row => row.kind),
    ['income', 'debt_purchase', 'asset_transfer']
  );
});

test('failed fallback completion compensates the account and removes the pending transaction', async () => {
  useUnsupportedTransactions();
  const asset = {
    _id: accountId,
    coupleId,
    userId,
    type: 'asset',
    balance: 100,
    currency: 'CNY',
    isArchived: false,
    updatedAt: new Date('2026-08-25T00:00:00Z')
  };
  const store = installFallbackStores({ accounts: [asset], failReady: true });

  const response = await fetch(`${baseUrl}/api/wallet/transactions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      type: 'expense', amount: 25, category: '餐饮', accountId,
      date: '2026-08-26', requestId: 'wallet-create-rollback'
    })
  });

  assert.equal(response.status, 500);
  assert.equal(asset.balance, 100);
  assert.equal(store.state.accountDeltaCalls, 1);
  assert.equal(store.state.deletedPending, 1);
  assert.equal(store.transactionRows.size, 0);
  assert.equal(asset.walletMutationRequestId, undefined);
  assert.equal(events.length, 0);
});

test('transaction update rejects a partner-created record without touching accounts', async () => {
  let accountCalls = 0;
  let saveCalls = 0;
  let findQuery;
  Transaction.findOne = async query => {
    findQuery = query;
    return {
      _id: transactionId,
      coupleId,
      creatorId: partnerId,
      type: 'expense',
      kind: 'expense',
      amount: 20,
      category: '餐饮',
      save: async () => { saveCalls += 1; }
    };
  };
  Account.findOne = async () => { accountCalls += 1; return null; };

  const response = await fetch(`${baseUrl}/api/wallet/transactions/${transactionId}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify({ amount: 30 })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.match(body.message, /自己创建/);
  assert.deepEqual(findQuery, { _id: transactionId, coupleId });
  assert.equal(accountCalls, 0);
  assert.equal(saveCalls, 0);
  assert.equal(events.length, 0);
});

test('updating a transaction on the same account reapplies from the rolled-back balance', async () => {
  let storedBalance = 75;
  let accountCall = 0;
  const transaction = {
    _id: transactionId,
    coupleId,
    creatorId: userId,
    type: 'expense',
    kind: 'expense',
    amount: 25,
    currency: 'CNY',
    category: '餐饮',
    accountId,
    toAccountId: null,
    date: new Date('2026-08-25T00:00:00+08:00'),
    note: '',
    save: async () => {}
  };
  Transaction.findOne = async () => transaction;
  Account.findOne = async query => {
    accountCall += 1;
    if (accountCall === 1) {
      assert.deepEqual(query, { _id: accountId, coupleId, userId, isArchived: false });
      return { _id: accountId, type: 'asset', balance: storedBalance, save: async () => {} };
    }
    if (accountCall === 2) {
      assert.deepEqual(query, { _id: accountId, coupleId });
    } else {
      assert.deepEqual(query, { _id: accountId, coupleId, userId, isArchived: false });
    }
    return {
      _id: accountId,
      userId,
      type: 'asset',
      balance: storedBalance,
      save: async function save() { storedBalance = this.balance; }
    };
  };

  const response = await fetch(`${baseUrl}/api/wallet/transactions/${transactionId}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify({ amount: 30 })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.amount, 30);
  assert.equal(storedBalance, 70);
  assert.equal(accountCall, 3);
  assert.deepEqual(events.map(event => event.message.type), ['accountSync', 'walletSync']);
});

test('system-managed repayment cannot be deleted through ordinary wallet transactions', async () => {
  let deleteCalls = 0;
  Transaction.findOne = async query => {
    assert.deepEqual(query, { _id: transactionId, coupleId });
    return {
      _id: transactionId,
      coupleId,
      creatorId: userId,
      type: 'transfer',
      kind: 'debt_payment',
      amount: 100
    };
  };
  Transaction.deleteOne = async () => { deleteCalls += 1; return { deletedCount: 1 }; };

  const response = await fetch(`${baseUrl}/api/wallet/transactions/${transactionId}`, {
    method: 'DELETE', headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.match(body.message, /欠款计划管理/);
  assert.equal(deleteCalls, 0);
  assert.equal(events.length, 0);
});

test('deleting an owned transaction rolls back only a couple-scoped account', async () => {
  let accountQuery;
  let deleteQuery;
  const asset = {
    _id: accountId,
    userId,
    type: 'asset',
    balance: 100,
    save: async () => {}
  };
  Transaction.findOne = async query => {
    assert.deepEqual(query, { _id: transactionId, coupleId });
    return {
      _id: transactionId,
      coupleId,
      creatorId: userId,
      type: 'expense',
      kind: 'expense',
      amount: 25,
      accountId
    };
  };
  Transaction.deleteOne = async query => {
    deleteQuery = query;
    return { deletedCount: 1 };
  };
  Account.findOne = async query => {
    accountQuery = query;
    return asset;
  };

  const response = await fetch(`${baseUrl}/api/wallet/transactions/${transactionId}`, {
    method: 'DELETE', headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(deleteQuery, { _id: transactionId, coupleId, creatorId: userId });
  assert.deepEqual(accountQuery, { _id: accountId, coupleId });
  assert.equal(asset.balance, 125);
  assert.deepEqual(events.map(event => event.message.type), ['accountSync', 'walletSync']);
});

test('the retired budget namespace is no longer mounted by the wallet router', async () => {
  const response = await fetch(`${baseUrl}/api/budget/transactions`, { headers: authHeaders() });
  assert.equal(response.status, 404);
});
