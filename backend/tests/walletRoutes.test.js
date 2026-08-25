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
    debtFind: DebtPlan.find,
    debtFindOne: DebtPlan.findOne,
    debtPaymentFindOne: DebtPayment.findOne,
    monthlyFind: MonthlyWalletPlan.find,
    monthlyFindOneAndUpdate: MonthlyWalletPlan.findOneAndUpdate,
    mongooseStartSession: mongoose.startSession,
    mongooseReadyState: mongoose.connection.readyState,
    transactionSave: Transaction.prototype.save,
    debtPaymentSave: DebtPayment.prototype.save
  };
});

test.after(async () => {
  User.findById = originals.userFindById;
  User.find = originals.userFind;
  Account.find = originals.accountFind;
  Account.findOne = originals.accountFindOne;
  Account.findOneAndUpdate = originals.accountFindOneAndUpdate;
  DebtPlan.find = originals.debtFind;
  DebtPlan.findOne = originals.debtFindOne;
  DebtPayment.findOne = originals.debtPaymentFindOne;
  MonthlyWalletPlan.find = originals.monthlyFind;
  MonthlyWalletPlan.findOneAndUpdate = originals.monthlyFindOneAndUpdate;
  mongoose.startSession = originals.mongooseStartSession;
  Object.defineProperty(mongoose.connection, 'readyState', {
    configurable: true,
    value: originals.mongooseReadyState
  });
  Transaction.prototype.save = originals.transactionSave;
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
  DebtPlan.find = originals.debtFind;
  DebtPlan.findOne = originals.debtFindOne;
  DebtPayment.findOne = originals.debtPaymentFindOne;
  MonthlyWalletPlan.find = originals.monthlyFind;
  MonthlyWalletPlan.findOneAndUpdate = originals.monthlyFindOneAndUpdate;
  Transaction.prototype.save = originals.transactionSave;
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
  assert.deepEqual(queried.debts, { coupleId, status: { $ne: 'archived' } });
  assert.deepEqual(queried.plans, { coupleId, month: '2026-08' });
  assert.deepEqual(queried.users, { _id: { $in: [userId, partnerId] } });
  assert.equal(body.data.accounts[0].coupleId, undefined);
  assert.equal(body.data.debts[0].coupleId, undefined);
  assert.equal(body.data.debts[0].schedule[0].paymentReference, undefined);
  assert.equal(body.data.monthlyPlans.length, 0);
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
    assert.deepEqual(query, { _id: debtId, coupleId, status: 'active' });
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
  DebtPayment.findOne = async () => ({ _id: paymentId, requestId: 'same-request', amount: 80 });
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
