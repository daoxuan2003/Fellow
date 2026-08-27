const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User } = require('../models');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { DebtPlan, MonthlyWalletPlan, DebtPayment } = require('../models/Wallet');
const walletRoutes = require('../routes/wallet');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const coupleId = [userId, partnerId].sort().join('_');
const debtId = '333333333333333333333333';
const assetAccountId = '444444444444444444444444';
const liabilityAccountId = '555555555555555555555555';
const installmentId = '666666666666666666666666';
const paymentId = '777777777777777777777777';

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

function installPaymentFallbackStore({ debt, asset, liability, failPaymentReady = false }) {
  const accounts = new Map([[String(asset._id), asset], [String(liability._id), liability]]);
  const payments = new Map();
  const transactions = new Map();
  const state = { accountDeltaCalls: 0, debtWrites: 0, paymentSaves: 0, transactionSaves: 0 };

  const findAccount = query => {
    const row = accounts.get(String(query._id));
    if (!row) return null;
    if (query.coupleId && row.coupleId !== query.coupleId) return null;
    if (query.userId && String(row.userId) !== String(query.userId)) return null;
    if (query.type && row.type !== query.type) return null;
    if (query.isArchived === false && row.isArchived) return null;
    return row;
  };
  Account.findOne = async query => findAccount(query);
  Account.findOneAndUpdate = async (query, update) => {
    const row = findAccount(query);
    if (!row) return null;
    if (query.walletMutationRequestId
      && String(row.walletMutationRequestId || '') !== String(query.walletMutationRequestId)) return null;
    if (typeof query.balance === 'number' && Number(row.balance) !== Number(query.balance)) return null;
    if (query.$or) {
      const markerAllowed = query.$or.some(condition => {
        if (condition.walletMutationRequestId?.$exists === false) return !row.walletMutationRequestId;
        if (condition.walletMutationRequestId === null) return !row.walletMutationRequestId;
        return String(condition.walletMutationRequestId || '') === String(row.walletMutationRequestId || '');
      });
      if (!markerAllowed) return null;
    }
    if (update.$inc?.balance !== undefined) {
      state.accountDeltaCalls += 1;
      row.balance = Number((Number(row.balance) + Number(update.$inc.balance)).toFixed(2));
    }
    if (update.$set) Object.assign(row, update.$set);
    if (update.$unset) {
      for (const key of Object.keys(update.$unset)) delete row[key];
    }
    return row;
  };

  DebtPlan.findOne = async query => {
    if (query._id && String(query._id) !== String(debt._id)) return null;
    if (query.coupleId && query.coupleId !== debt.coupleId) return null;
    if (query.ownerId && String(query.ownerId) !== String(debt.ownerId)) return null;
    if (query.status === 'active' && debt.status !== 'active') return null;
    if (query.setupStatus?.$ne === 'pending' && debt.setupStatus === 'pending') return null;
    return debt;
  };
  DebtPlan.findOneAndUpdate = async (query, update) => {
    if (String(query._id) !== String(debt._id) || query.coupleId !== debt.coupleId) return null;
    if (query.ownerId && String(query.ownerId) !== String(debt.ownerId)) return null;
    if (query.outstandingAmount !== undefined
      && Number(query.outstandingAmount) !== Number(debt.outstandingAmount)) return null;
    if (query.paymentMutationRequestId
      && String(query.paymentMutationRequestId) !== String(debt.paymentMutationRequestId || '')) return null;
    if (query.$or) {
      const markerAllowed = query.$or.some(condition => {
        if (condition.paymentMutationRequestId?.$exists === false) return !debt.paymentMutationRequestId;
        if (condition.paymentMutationRequestId === null) return !debt.paymentMutationRequestId;
        return String(condition.paymentMutationRequestId || '') === String(debt.paymentMutationRequestId || '');
      });
      if (!markerAllowed) return null;
    }
    state.debtWrites += 1;
    if (update.$set) Object.assign(debt, update.$set);
    if (update.$unset) {
      for (const key of Object.keys(update.$unset)) delete debt[key];
    }
    return debt;
  };

  const findPayment = query => [...payments.values()].find(row => {
    if (query._id && String(query._id) !== String(row._id)) return false;
    if (query.coupleId && query.coupleId !== row.coupleId) return false;
    if (query.requestId && query.requestId !== row.requestId) return false;
    if (query.mutationStatus && query.mutationStatus !== row.mutationStatus) return false;
    return true;
  }) || null;
  DebtPayment.findOne = async query => findPayment(query);
  DebtPayment.prototype.save = async function save() {
    if (!this._id) this._id = new mongoose.Types.ObjectId(paymentId);
    state.paymentSaves += 1;
    payments.set(String(this.requestId), this);
    return this;
  };
  DebtPayment.findOneAndUpdate = async (query, update) => {
    const row = findPayment(query);
    if (!row) return null;
    if (failPaymentReady && row.mutationStatus === 'pending'
      && update.$set?.mutationStatus === 'ready') throw new Error('simulated payment ready failure');
    if (update.$set) Object.assign(row, update.$set);
    if (update.$unset) {
      for (const key of Object.keys(update.$unset)) row[key] = undefined;
    }
    return row;
  };
  DebtPayment.deleteOne = async query => {
    const row = findPayment(query);
    if (!row) return { deletedCount: 0 };
    payments.delete(String(row.requestId));
    return { deletedCount: 1 };
  };

  const findTransaction = query => [...transactions.values()].find(row => {
    if (query._id && String(query._id) !== String(row._id)) return false;
    if (query.coupleId && query.coupleId !== row.coupleId) return false;
    if (query.requestId && query.requestId !== row.requestId) return false;
    if (query.kind && query.kind !== row.kind) return false;
    if (query.mutationStatus && query.mutationStatus !== row.mutationStatus) return false;
    return true;
  }) || null;
  Transaction.findOne = async query => findTransaction(query);
  Transaction.prototype.save = async function save() {
    state.transactionSaves += 1;
    transactions.set(String(this.requestId), this);
    return this;
  };
  Transaction.findOneAndUpdate = async (query, update) => {
    const row = findTransaction(query);
    if (!row) return null;
    if (update.$set) Object.assign(row, update.$set);
    return row;
  };
  Transaction.deleteOne = async query => {
    const row = findTransaction(query);
    if (!row) return { deletedCount: 0 };
    transactions.delete(String(row.requestId));
    return { deletedCount: 1 };
  };

  return { accounts, payments, transactions, state };
}

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => events.push({ coupleId: targetCoupleId, message });
  app.use('/api/wallet', walletRoutes);
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  originals = {
    userFindById: User.findById,
    userFind: User.find,
    accountFind: Account.find,
    accountFindOne: Account.findOne,
    accountFindOneAndUpdate: Account.findOneAndUpdate,
    accountDeleteOne: Account.deleteOne,
    accountSave: Account.prototype.save,
    debtFind: DebtPlan.find,
    debtFindOne: DebtPlan.findOne,
    debtFindOneAndUpdate: DebtPlan.findOneAndUpdate,
    debtDeleteOne: DebtPlan.deleteOne,
    debtSave: DebtPlan.prototype.save,
    debtPaymentFindOne: DebtPayment.findOne,
    debtPaymentFindOneAndUpdate: DebtPayment.findOneAndUpdate,
    debtPaymentDeleteOne: DebtPayment.deleteOne,
    monthlyFind: MonthlyWalletPlan.find,
    monthlyFindOneAndUpdate: MonthlyWalletPlan.findOneAndUpdate,
    mongooseStartSession: mongoose.startSession,
    mongooseReadyState: mongoose.connection.readyState,
    transactionSave: Transaction.prototype.save,
    transactionFindOne: Transaction.findOne,
    transactionFindOneAndUpdate: Transaction.findOneAndUpdate,
    transactionDeleteOne: Transaction.deleteOne,
    debtPaymentSave: DebtPayment.prototype.save
  };
});

test.after(async () => {
  User.findById = originals.userFindById;
  User.find = originals.userFind;
  Account.find = originals.accountFind;
  Account.findOne = originals.accountFindOne;
  Account.findOneAndUpdate = originals.accountFindOneAndUpdate;
  Account.deleteOne = originals.accountDeleteOne;
  Account.prototype.save = originals.accountSave;
  DebtPlan.find = originals.debtFind;
  DebtPlan.findOne = originals.debtFindOne;
  DebtPlan.findOneAndUpdate = originals.debtFindOneAndUpdate;
  DebtPlan.deleteOne = originals.debtDeleteOne;
  DebtPlan.prototype.save = originals.debtSave;
  DebtPayment.findOne = originals.debtPaymentFindOne;
  DebtPayment.findOneAndUpdate = originals.debtPaymentFindOneAndUpdate;
  DebtPayment.deleteOne = originals.debtPaymentDeleteOne;
  MonthlyWalletPlan.find = originals.monthlyFind;
  MonthlyWalletPlan.findOneAndUpdate = originals.monthlyFindOneAndUpdate;
  mongoose.startSession = originals.mongooseStartSession;
  Object.defineProperty(mongoose.connection, 'readyState', {
    configurable: true,
    value: originals.mongooseReadyState
  });
  Transaction.prototype.save = originals.transactionSave;
  Transaction.findOne = originals.transactionFindOne;
  Transaction.findOneAndUpdate = originals.transactionFindOneAndUpdate;
  Transaction.deleteOne = originals.transactionDeleteOne;
  DebtPayment.prototype.save = originals.debtPaymentSave;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test.beforeEach(() => {
  events = [];
  mongoose.startSession = originals.mongooseStartSession;
  Object.defineProperty(mongoose.connection, 'readyState', {
    configurable: true,
    value: originals.mongooseReadyState
  });
  User.findById = async id => ({ _id: id, partnerId, nickname: '我' });
  User.find = originals.userFind;
  Account.find = originals.accountFind;
  Account.findOne = originals.accountFindOne;
  Account.findOneAndUpdate = originals.accountFindOneAndUpdate;
  Account.deleteOne = originals.accountDeleteOne;
  Account.prototype.save = originals.accountSave;
  DebtPlan.find = originals.debtFind;
  DebtPlan.findOne = originals.debtFindOne;
  DebtPlan.findOneAndUpdate = originals.debtFindOneAndUpdate;
  DebtPlan.deleteOne = originals.debtDeleteOne;
  DebtPlan.prototype.save = originals.debtSave;
  DebtPayment.findOne = originals.debtPaymentFindOne;
  DebtPayment.findOneAndUpdate = originals.debtPaymentFindOneAndUpdate;
  DebtPayment.deleteOne = originals.debtPaymentDeleteOne;
  MonthlyWalletPlan.find = originals.monthlyFind;
  MonthlyWalletPlan.findOneAndUpdate = originals.monthlyFindOneAndUpdate;
  Transaction.prototype.save = originals.transactionSave;
  Transaction.findOne = originals.transactionFindOne;
  Transaction.findOneAndUpdate = originals.transactionFindOneAndUpdate;
  Transaction.deleteOne = originals.transactionDeleteOne;
  DebtPayment.prototype.save = originals.debtPaymentSave;
});

test('wallet mutations fail closed when MongoDB transactions are unavailable', async () => {
  let ended = false;
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, value: 1 });
  mongoose.startSession = async () => ({
    withTransaction: async () => {
      throw new Error('Transaction numbers are only allowed on a replica set member or mongos');
    },
    endSession: async () => { ended = true; }
  });

  await assert.rejects(
    () => walletRoutes.withWalletTransaction(async () => 'must not complete'),
    error => error.code === 'TRANSACTION_UNAVAILABLE' && error.statusCode === 503
  );
  assert.equal(ended, true);
});

test('production wallet writes do not fall back while MongoDB is disconnected', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, value: 0 });
  try {
    await assert.rejects(
      () => walletRoutes.withWalletTransaction(async () => 'unsafe fallback'),
      error => error.code === 'TRANSACTION_UNAVAILABLE' && error.statusCode === 503
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('debt creation uses an idempotent compensating path when transactions are unavailable', async () => {
  useUnsupportedTransactions();
  const requestId = 'debt-create-once';
  const debtWrites = [];
  let accountActivation;

  DebtPlan.findOne = async query => {
    assert.deepEqual(query, { coupleId, ownerId: userId, creationRequestId: requestId });
    return null;
  };
  Account.findOne = async query => {
    assert.deepEqual(query, { coupleId, userId, debtSetupRequestId: requestId });
    return null;
  };
  Account.prototype.save = async function save() {
    assert.equal(this.coupleId, coupleId);
    assert.equal(this.userId, userId);
    assert.equal(this.type, 'liability');
    assert.equal(this.isArchived, true);
    assert.equal(this.debtSetupRequestId, requestId);
    return this;
  };
  DebtPlan.prototype.save = async function save() {
    debtWrites.push(this.setupStatus);
    return this;
  };
  Account.findOneAndUpdate = async (query, update) => {
    accountActivation = { query, update };
    return {
      _id: query._id,
      coupleId,
      userId,
      name: '花呗',
      type: 'liability',
      subType: 'huabei',
      currency: 'CNY',
      balance: 1234.56,
      isArchived: false
    };
  };
  Account.deleteOne = async () => { throw new Error('must not roll back a successful setup'); };
  DebtPlan.deleteOne = async () => { throw new Error('must not roll back a successful setup'); };

  const response = await fetch(`${baseUrl}/api/wallet/debts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name: '花呗',
      provider: 'huabei',
      amount: 1200,
      feeAmount: 34.56,
      firstDueDate: '2026-08-30',
      installmentCount: 3,
      requestId
    })
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.replay, false);
  assert.equal(body.data.setupStatus, undefined);
  assert.equal(body.data.creationRequestId, undefined);
  assert.deepEqual(debtWrites, ['pending', 'ready']);
  assert.equal(accountActivation.query.coupleId, coupleId);
  assert.equal(accountActivation.query.userId, userId);
  assert.equal(accountActivation.query.debtSetupRequestId, requestId);
  assert.equal(accountActivation.update.$set.balance, 1234.56);
  assert.equal(accountActivation.update.$set.isArchived, false);
  assert.deepEqual(events.map(event => event.message.type), ['accountSync', 'walletSync']);
  assert.ok(events.every(event => event.message.data.requestId === requestId));
});

test('a completed debt request replays without writes or duplicate broadcasts', async () => {
  useUnsupportedTransactions();
  const requestId = 'debt-create-replay';
  const debt = {
    _id: debtId,
    ownerId: userId,
    liabilityAccountId,
    name: '白条',
    provider: 'baitiao',
    originalAmount: 600,
    feeAmount: 0,
    outstandingAmount: 600,
    firstDueDate: '2026-09-01',
    installmentCount: 2,
    schedule: [],
    setupStatus: 'ready',
    status: 'active'
  };
  DebtPlan.findOne = async () => debt;
  Account.findOne = async query => {
    assert.deepEqual(query, { _id: liabilityAccountId, coupleId, userId, type: 'liability' });
    return { _id: liabilityAccountId, coupleId, userId, name: '白条', type: 'liability', balance: 600 };
  };
  Account.findOneAndUpdate = async query => {
    assert.equal(query.debtSetupLockId, requestId);
    return null;
  };
  Account.prototype.save = async () => { throw new Error('must not write account'); };
  DebtPlan.prototype.save = async () => { throw new Error('must not write debt'); };

  const response = await fetch(`${baseUrl}/api/wallet/debts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name: '白条', provider: 'baitiao', amount: 600, feeAmount: 0,
      firstDueDate: '2026-09-01', installmentCount: 2, requestId
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.replay, true);
  assert.equal(events.length, 0);
});

test('retry resumes a pending debt setup and broadcasts only after it becomes visible', async () => {
  useUnsupportedTransactions();
  const requestId = 'debt-create-resume';
  const debt = {
    _id: debtId,
    ownerId: userId,
    liabilityAccountId,
    name: '信用卡',
    provider: 'credit_card',
    originalAmount: 900,
    feeAmount: 9,
    outstandingAmount: 909,
    firstDueDate: '2026-09-10',
    installmentCount: 3,
    schedule: [],
    setupStatus: 'pending',
    setupCreatedAccount: true,
    status: 'active',
    save: async function save() { return this; }
  };
  DebtPlan.findOne = async () => debt;
  Account.findOne = async () => ({
    _id: liabilityAccountId,
    coupleId,
    userId,
    name: '信用卡',
    type: 'liability',
    balance: 909,
    isArchived: true
  });
  Account.findOneAndUpdate = async (query, update) => {
    assert.equal(query.debtSetupRequestId, requestId);
    assert.equal(update.$set.isArchived, false);
    return { _id: liabilityAccountId, coupleId, userId, name: '信用卡', type: 'liability', balance: 909, isArchived: false };
  };

  const response = await fetch(`${baseUrl}/api/wallet/debts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name: '信用卡', provider: 'credit_card', amount: 900, feeAmount: 9,
      firstDueDate: '2026-09-10', installmentCount: 3, requestId
    })
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.replay, true);
  assert.equal(debt.setupStatus, 'ready');
  assert.deepEqual(events.map(event => event.message.type), ['accountSync', 'walletSync']);
});

test('failed standalone debt setup removes its hidden account and pending plan', async () => {
  useUnsupportedTransactions();
  const requestId = 'debt-create-rollback';
  const deleted = [];
  DebtPlan.findOne = async () => null;
  Account.findOne = async () => null;
  Account.prototype.save = async function save() { return this; };
  DebtPlan.prototype.save = async function save() { return this; };
  Account.findOneAndUpdate = async () => null;
  DebtPlan.deleteOne = async query => { deleted.push(['debt', query]); return { deletedCount: 1 }; };
  Account.deleteOne = async query => { deleted.push(['account', query]); return { deletedCount: 1 }; };

  const response = await fetch(`${baseUrl}/api/wallet/debts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name: '借款', provider: 'loan', amount: 100, feeAmount: 0,
      firstDueDate: '2026-09-15', installmentCount: 1, requestId
    })
  });
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.code, 'STALE_LIABILITY_ACCOUNT');
  assert.deepEqual(deleted.map(row => row[0]), ['debt', 'account']);
  assert.equal(events.length, 0);
});

test('existing liability balance is restored if finalizing a standalone debt fails', async () => {
  useUnsupportedTransactions();
  const requestId = 'debt-create-existing-rollback';
  const previousUpdatedAt = new Date('2026-08-20T00:00:00.000Z');
  const accountCalls = [];
  let debtSaveCount = 0;
  let debtDeleted = false;

  DebtPlan.findOne = async query => query.creationRequestId ? null : null;
  Account.findOne = async () => ({
    _id: liabilityAccountId,
    coupleId,
    userId,
    name: '已有负债',
    type: 'liability',
    balance: 88,
    updatedAt: previousUpdatedAt,
    isArchived: false
  });
  Account.findOneAndUpdate = async (query, update) => {
    accountCalls.push({ query, update });
    if (accountCalls.length === 1) {
      assert.equal(query._id, liabilityAccountId);
      assert.ok(query.$or);
      return { _id: liabilityAccountId, coupleId, userId, type: 'liability', balance: 88, updatedAt: previousUpdatedAt };
    }
    if (accountCalls.length === 2) {
      assert.equal(query.debtSetupLockId, requestId);
      assert.equal(update.$unset, undefined);
      return { _id: liabilityAccountId, coupleId, userId, type: 'liability', balance: 500, updatedAt: new Date() };
    }
    if (accountCalls.length === 3) {
      assert.equal(query.debtSetupLockId, requestId);
      assert.equal(query.balance, 500);
      assert.equal(update.$set.balance, 88);
      assert.equal(update.$set.updatedAt, previousUpdatedAt);
      return { _id: liabilityAccountId, coupleId, userId, type: 'liability', balance: 88 };
    }
    assert.equal(query.debtSetupLockId, requestId);
    return null;
  };
  DebtPlan.prototype.save = async function save() {
    debtSaveCount += 1;
    if (debtSaveCount === 2) throw new Error('simulated final debt save failure');
    return this;
  };
  DebtPlan.deleteOne = async query => {
    assert.equal(query.setupStatus, 'pending');
    debtDeleted = true;
    return { deletedCount: 1 };
  };
  Account.deleteOne = async () => { throw new Error('must not delete a pre-existing account'); };

  const response = await fetch(`${baseUrl}/api/wallet/debts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name: '已有负债', provider: 'other', amount: 500, feeAmount: 0,
      firstDueDate: '2026-09-20', installmentCount: 1,
      liabilityAccountId, requestId
    })
  });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.message, '服务器错误');
  assert.equal(debtDeleted, true);
  assert.equal(accountCalls.length, 4);
  assert.equal(events.length, 0);
});

test('an ambiguous final debt save is confirmed before compensation', async () => {
  useUnsupportedTransactions();
  const requestId = 'debt-create-ambiguous-save';
  let findCount = 0;
  const persistedDebt = {
    _id: debtId,
    ownerId: userId,
    liabilityAccountId,
    name: '花呗',
    provider: 'huabei',
    originalAmount: 300,
    feeAmount: 0,
    outstandingAmount: 300,
    firstDueDate: '2026-09-25',
    installmentCount: 1,
    schedule: [],
    setupStatus: 'ready',
    status: 'active'
  };

  DebtPlan.findOne = async query => {
    assert.equal(query.creationRequestId, requestId);
    findCount += 1;
    return findCount === 1 ? null : persistedDebt;
  };
  Account.findOne = async () => null;
  Account.prototype.save = async function save() { return this; };
  DebtPlan.prototype.save = async function save() {
    if (this.setupStatus === 'ready') throw new Error('simulated ambiguous write acknowledgement');
    return this;
  };
  Account.findOneAndUpdate = async query => ({
    _id: query._id,
    coupleId,
    userId,
    name: '花呗',
    type: 'liability',
    balance: 300,
    isArchived: false
  });
  DebtPlan.deleteOne = async () => { throw new Error('must not compensate a confirmed ready debt'); };
  Account.deleteOne = async () => { throw new Error('must not compensate a confirmed ready account'); };

  const response = await fetch(`${baseUrl}/api/wallet/debts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name: '花呗', provider: 'huabei', amount: 300, feeAmount: 0,
      firstDueDate: '2026-09-25', installmentCount: 1, requestId
    })
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(findCount, 2);
  assert.deepEqual(events.map(event => event.message.type), ['accountSync', 'walletSync']);
});

test('wallet overview scopes every collection to the JWT couple and omits internal couple keys', async () => {
  const queried = {};
  Account.find = query => {
    queried.accounts = query;
    return { sort: () => ({ lean: async () => [{ _id: assetAccountId, coupleId, userId, name: '工资卡', type: 'asset', subType: 'bank', currency: 'CNY', balance: 500 }] }) };
  };
  DebtPlan.find = query => {
    queried.debts = query;
    return { sort: () => ({ lean: async () => [{ _id: debtId, coupleId, ownerId: userId, liabilityAccountId, name: '花呗', provider: 'huabei', originalAmount: 300, feeAmount: 0, outstandingAmount: 300, firstDueDate: '2026-08-30', installmentCount: 1, schedule: [{ _id: installmentId, sequence: 1, dueDate: '2026-08-30', plannedAmount: 300, paidAmount: 0, status: 'pending', paymentReference: 'internal-request' }], status: 'active' }] }) };
  };
  MonthlyWalletPlan.find = query => {
    queried.plans = query;
    return { lean: async () => [] };
  };
  User.find = query => {
    queried.users = query;
    return { select: () => ({ lean: async () => [{ _id: userId, nickname: '我' }, { _id: partnerId, nickname: '伴侣' }] }) };
  };

  const response = await fetch(`${baseUrl}/api/wallet/overview?month=2026-08`, { headers: authHeaders() });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(queried.accounts, { coupleId, isArchived: false });
  assert.deepEqual(queried.debts, {
    coupleId,
    status: { $ne: 'archived' },
    setupStatus: { $ne: 'pending' }
  });
  assert.deepEqual(queried.plans, { coupleId, month: '2026-08' });
  assert.deepEqual(queried.users, { _id: { $in: [userId, partnerId] } });
  assert.equal(body.data.accounts[0].coupleId, undefined);
  assert.equal(body.data.debts[0].coupleId, undefined);
  assert.equal(body.data.debts[0].schedule[0].paymentReference, undefined);
  assert.equal(body.data.monthlyPlans.length, 0);
  assert.deepEqual(body.data.cycle, {
    key: '2026-08', startDate: '2026-08-25', endDate: '2026-09-24'
  });
  assert.equal(body.data.summaries[0].upcomingDebt, 300);
  assert.equal(body.data.summaries[0].cutoffDate, '2026-09-24');
});

test('monthly plan upsert derives its owner and couple from JWT', async () => {
  let filter;
  let update;
  MonthlyWalletPlan.findOneAndUpdate = async (query, change) => {
    filter = query;
    update = change;
    return { _id: 'plan', ...query, ...change.$set };
  };

  const response = await fetch(`${baseUrl}/api/wallet/monthly-plan/2026-08`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      ownerId: partnerId,
      expectedIncome: { title: '工资', amount: 8000, date: '2026-08-28' },
      pockets: [{ key: 'debt', amount: 3000 }]
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(filter, { coupleId, ownerId: userId, month: '2026-08' });
  assert.equal(update.$set.pockets.length, 5);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.type, 'walletSync');
});

test('monthly plan rejects an expected income date outside its payday cycle', async () => {
  const response = await fetch(`${baseUrl}/api/wallet/monthly-plan/2026-08`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      expectedIncome: { title: '下个周期工资', amount: 8000, date: '2026-09-25' },
      pockets: []
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.code, 'INCOME_OUTSIDE_CYCLE');
});

test('repayment allows partner debt but only queries the JWT payer own asset account', async () => {
  const accountQueries = [];
  const writes = [];
  DebtPayment.findOne = async query => {
    assert.deepEqual(query, { coupleId, requestId: 'pay-once' });
    return null;
  };
  const schedule = [{
    _id: new mongoose.Types.ObjectId(installmentId),
    sequence: 1,
    dueDate: '2026-08-30',
    plannedAmount: 300,
    paidAmount: 0,
    status: 'pending'
  }];
  DebtPlan.findOne = async query => {
    assert.deepEqual(query, {
      _id: debtId,
      coupleId,
      status: 'active',
      setupStatus: { $ne: 'pending' }
    });
    return {
      _id: new mongoose.Types.ObjectId(debtId),
      ownerId: partnerId,
      liabilityAccountId: new mongoose.Types.ObjectId(liabilityAccountId),
      outstandingAmount: 300,
      status: 'active',
      schedule,
      save: async () => writes.push('debt')
    };
  };
  Account.findOne = async query => {
    accountQueries.push(query);
    if (String(query._id) === assetAccountId) {
      return { _id: new mongoose.Types.ObjectId(assetAccountId), userId, type: 'asset', balance: 500 };
    }
    return {
      _id: new mongoose.Types.ObjectId(liabilityAccountId),
      userId: partnerId,
      type: 'liability',
      balance: 300
    };
  };
  Account.findOneAndUpdate = async query => {
    writes.push(String(query._id) === assetAccountId ? 'asset' : 'liability');
    return {
      _id: query._id,
      userId: String(query._id) === assetAccountId ? userId : partnerId,
      type: String(query._id) === assetAccountId ? 'asset' : 'liability',
      balance: String(query._id) === assetAccountId ? 200 : 0,
      currency: 'CNY'
    };
  };
  Transaction.prototype.save = async function save() {
    writes.push('transaction');
    return this;
  };
  DebtPayment.prototype.save = async function save() {
    this._id = new mongoose.Types.ObjectId(paymentId);
    writes.push('payment');
    return this;
  };

  const response = await fetch(`${baseUrl}/api/wallet/debts/${debtId}/payments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      payerId: partnerId,
      assetAccountId,
      amount: 300,
      requestId: 'pay-once'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.deepEqual(accountQueries[0], {
    _id: assetAccountId,
    coupleId,
    userId,
    type: 'asset',
    isArchived: false
  });
  assert.deepEqual(accountQueries[1], {
    _id: new mongoose.Types.ObjectId(liabilityAccountId),
    coupleId,
    userId: partnerId,
    type: 'liability',
    isArchived: false
  });
  assert.deepEqual(writes, ['asset', 'liability', 'debt', 'transaction', 'payment']);
  assert.equal(events.length, 3);
  assert.ok(events.every(event => event.coupleId === coupleId));
  assert.deepEqual(events.map(event => event.message.type), ['accountSync', 'accountSync', 'walletSync']);
  assert.equal(events.at(-1).message.type, 'walletSync');
});

test('replaying a repayment request returns the existing payment without writes or broadcasts', async () => {
  DebtPayment.findOne = async () => ({
    _id: paymentId,
    requestId: 'same-request',
    mutationStatus: 'ready',
    debtPlanId: debtId,
    payerId: userId,
    assetAccountId,
    amount: 80
  });
  DebtPlan.findOne = async () => { throw new Error('must not load debt on replay'); };
  Account.findOne = async () => { throw new Error('must not load accounts on replay'); };

  const response = await fetch(`${baseUrl}/api/wallet/debts/${debtId}/payments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ assetAccountId, amount: 80, requestId: 'same-request' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.replay, true);
  assert.equal(body.data.requestId, undefined);
  assert.equal(events.length, 0);
});

test('unsupported transactions complete a repayment once and replay without double deductions', async () => {
  useUnsupportedTransactions();
  const debt = {
    _id: new mongoose.Types.ObjectId(debtId), coupleId, ownerId: partnerId,
    liabilityAccountId: new mongoose.Types.ObjectId(liabilityAccountId),
    outstandingAmount: 300, status: 'active', setupStatus: 'ready',
    schedule: [{
      _id: new mongoose.Types.ObjectId(installmentId), sequence: 1, dueDate: '2026-08-30',
      plannedAmount: 300, paidAmount: 0, status: 'pending'
    }]
  };
  const asset = {
    _id: new mongoose.Types.ObjectId(assetAccountId), coupleId, userId, type: 'asset',
    balance: 500, currency: 'CNY', isArchived: false, updatedAt: new Date('2026-08-26T00:00:00Z')
  };
  const liability = {
    _id: new mongoose.Types.ObjectId(liabilityAccountId), coupleId, userId: partnerId, type: 'liability',
    balance: 300, currency: 'CNY', isArchived: false, updatedAt: new Date('2026-08-26T00:00:00Z')
  };
  const store = installPaymentFallbackStore({ debt, asset, liability });
  const payload = { assetAccountId, amount: 100, requestId: 'payment-fallback-once' };

  const first = await fetch(`${baseUrl}/api/wallet/debts/${debtId}/payments`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload)
  });
  const firstBody = await first.json();
  const second = await fetch(`${baseUrl}/api/wallet/debts/${debtId}/payments`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload)
  });
  const secondBody = await second.json();
  const conflict = await fetch(`${baseUrl}/api/wallet/debts/${debtId}/payments`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ ...payload, note: 'changed retry' })
  });
  const conflictBody = await conflict.json();

  assert.equal(first.status, 201);
  assert.equal(firstBody.replay, false);
  assert.equal(second.status, 200);
  assert.equal(secondBody.replay, true);
  assert.equal(conflict.status, 409);
  assert.equal(conflictBody.code, 'REQUEST_ID_CONFLICT');
  assert.equal(asset.balance, 400);
  assert.equal(liability.balance, 200);
  assert.equal(debt.outstandingAmount, 200);
  assert.equal(debt.schedule[0].paidAmount, 100);
  assert.equal(store.state.accountDeltaCalls, 2);
  assert.equal(store.state.debtWrites, 1);
  assert.equal(store.state.paymentSaves, 1);
  assert.equal(store.state.transactionSaves, 1);
  assert.equal(store.payments.get(payload.requestId).mutationStatus, 'ready');
  assert.equal(store.transactions.get(payload.requestId).mutationStatus, 'ready');
  assert.deepEqual(events.map(event => event.message.type), ['accountSync', 'accountSync', 'walletSync']);
  assert.ok(events.every(event => event.message.data.requestId === payload.requestId));
});

test('a failed unsupported repayment compensates both accounts, debt, ledger and payment', async () => {
  useUnsupportedTransactions();
  const originalSchedule = [{
    _id: new mongoose.Types.ObjectId(installmentId), sequence: 1, dueDate: '2026-08-30',
    plannedAmount: 300, paidAmount: 0, status: 'pending'
  }];
  const debt = {
    _id: new mongoose.Types.ObjectId(debtId), coupleId, ownerId: partnerId,
    liabilityAccountId: new mongoose.Types.ObjectId(liabilityAccountId),
    outstandingAmount: 300, status: 'active', setupStatus: 'ready',
    schedule: originalSchedule.map(row => ({ ...row }))
  };
  const asset = {
    _id: new mongoose.Types.ObjectId(assetAccountId), coupleId, userId, type: 'asset',
    balance: 500, currency: 'CNY', isArchived: false, updatedAt: new Date('2026-08-26T00:00:00Z')
  };
  const liability = {
    _id: new mongoose.Types.ObjectId(liabilityAccountId), coupleId, userId: partnerId, type: 'liability',
    balance: 300, currency: 'CNY', isArchived: false, updatedAt: new Date('2026-08-26T00:00:00Z')
  };
  const store = installPaymentFallbackStore({ debt, asset, liability, failPaymentReady: true });

  const response = await fetch(`${baseUrl}/api/wallet/debts/${debtId}/payments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ assetAccountId, amount: 100, requestId: 'payment-fallback-rollback' })
  });

  assert.equal(response.status, 500);
  assert.equal(asset.balance, 500);
  assert.equal(liability.balance, 300);
  assert.equal(asset.walletMutationRequestId, undefined);
  assert.equal(liability.walletMutationRequestId, undefined);
  assert.equal(debt.outstandingAmount, 300);
  assert.equal(debt.status, 'active');
  assert.equal(debt.schedule[0].paidAmount, 0);
  assert.equal(debt.paymentMutationRequestId, undefined);
  assert.equal(store.payments.size, 0);
  assert.equal(store.transactions.size, 0);
  assert.equal(events.length, 0);
});

test('repayment does not roll back an account marker owned by another pending wallet mutation', async () => {
  useUnsupportedTransactions();
  const debt = {
    _id: new mongoose.Types.ObjectId(debtId), coupleId, ownerId: partnerId,
    liabilityAccountId: new mongoose.Types.ObjectId(liabilityAccountId),
    outstandingAmount: 300, status: 'active', setupStatus: 'ready',
    schedule: [{
      _id: new mongoose.Types.ObjectId(installmentId), sequence: 1, dueDate: '2026-08-30',
      plannedAmount: 300, paidAmount: 0, status: 'pending'
    }]
  };
  const asset = {
    _id: new mongoose.Types.ObjectId(assetAccountId), coupleId, userId, type: 'asset',
    balance: 500, currency: 'CNY', isArchived: false,
    walletMutationRequestId: 'blocking-transaction', walletMutationPreviousBalance: 600,
    walletMutationPreviousUpdatedAt: new Date('2026-08-25T00:00:00Z')
  };
  const liability = {
    _id: new mongoose.Types.ObjectId(liabilityAccountId), coupleId, userId: partnerId, type: 'liability',
    balance: 300, currency: 'CNY', isArchived: false
  };
  const store = installPaymentFallbackStore({ debt, asset, liability });
  store.transactions.set('blocking-transaction', {
    _id: new mongoose.Types.ObjectId(), coupleId, requestId: 'blocking-transaction',
    mutationStatus: 'pending', kind: 'expense'
  });

  const response = await fetch(`${baseUrl}/api/wallet/debts/${debtId}/payments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ assetAccountId, amount: 100, requestId: 'payment-while-busy' })
  });
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.code, 'ACCOUNT_BUSY');
  assert.equal(asset.balance, 500);
  assert.equal(asset.walletMutationRequestId, 'blocking-transaction');
  assert.equal(store.state.accountDeltaCalls, 0);
  assert.equal(store.payments.size, 0);
  assert.equal(store.transactions.has('blocking-transaction'), true);
  assert.equal(events.length, 0);
});
