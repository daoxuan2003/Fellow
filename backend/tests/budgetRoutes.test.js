const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User } = require('../models');
const Account = require('../models/Account');
const { Transaction } = require('../models/Budget');
const budgetRoutes = require('../routes/budget');

const viewerId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const coupleId = [viewerId, partnerId].sort().join('_');
const accountId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const foreignAccountId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const transactionId = 'cccccccccccccccccccccccc';

let server;
let baseUrl;
let originalUserFindById;
let originalAccountFindOne;
let originalTransactionSave;
let originalTransactionFindById;
let originalTransactionDeleteOne;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/budget', budgetRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalAccountFindOne = Account.findOne;
  originalTransactionSave = Transaction.prototype.save;
  originalTransactionFindById = Transaction.findById;
  originalTransactionDeleteOne = Transaction.deleteOne;
});

test.after(async () => {
  User.findById = originalUserFindById;
  Account.findOne = originalAccountFindOne;
  Transaction.prototype.save = originalTransactionSave;
  Transaction.findById = originalTransactionFindById;
  Transaction.deleteOne = originalTransactionDeleteOne;

  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test.beforeEach(() => {
  User.findById = async () => ({ _id: viewerId, partnerId });
  Account.findOne = originalAccountFindOne;
  Transaction.prototype.save = originalTransactionSave;
  Transaction.findById = originalTransactionFindById;
  Transaction.deleteOne = originalTransactionDeleteOne;
});

function authHeaders() {
  const token = jwt.sign({ userId: viewerId, account: 'viewer' }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '5m'
  });
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

function createTransaction(overrides = {}) {
  return {
    _id: transactionId,
    coupleId,
    type: 'expense',
    amount: 30,
    accountId,
    toAccountId: null,
    category: '餐饮',
    currency: 'CNY',
    date: new Date('2026-06-29T00:00:00.000Z'),
    note: '',
    async save() {},
    ...overrides
  };
}

function installAccountStore(records, onSave = () => {}) {
  const accountQueries = [];
  const store = new Map(records.map((record) => [record._id, { ...record }]));

  Account.findOne = async (query) => {
    accountQueries.push(query);
    const id = query._id?.toString();
    const record = store.get(id);
    if (!record || record.coupleId !== query.coupleId) return null;

    return {
      ...record,
      async save() {
        record.balance = this.balance;
        record.updatedAt = this.updatedAt;
        onSave(record);
      }
    };
  };

  return { store, accountQueries };
}

test('transaction creation rejects account ids outside the current couple', async () => {
  let transactionSaveCalls = 0;
  const { accountQueries } = installAccountStore([
    { _id: foreignAccountId, coupleId: '333333333333333333333333_444444444444444444444444', balance: 100 }
  ]);

  Transaction.prototype.save = async function save() {
    transactionSaveCalls += 1;
  };

  const response = await fetch(`${baseUrl}/api/budget/transactions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      type: 'expense',
      amount: 20,
      category: '餐饮',
      accountId: foreignAccountId,
      date: '2026-06-29'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.message, /账户不存在|无权操作/);
  assert.equal(transactionSaveCalls, 0);
  assert.deepEqual(accountQueries[0], { _id: foreignAccountId, coupleId });
});

test('transaction update rejects a new foreign account before saving or rollback', async () => {
  let transactionSaveCalls = 0;
  let accountSaveCalls = 0;
  installAccountStore([
    { _id: accountId, coupleId, balance: 70 },
    { _id: foreignAccountId, coupleId: '333333333333333333333333_444444444444444444444444', balance: 100 }
  ], () => {
    accountSaveCalls += 1;
  });

  Transaction.findById = async () => createTransaction({
    async save() {
      transactionSaveCalls += 1;
    }
  });

  const response = await fetch(`${baseUrl}/api/budget/transactions/${transactionId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ accountId: foreignAccountId })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.message, /账户不存在|无权操作/);
  assert.equal(transactionSaveCalls, 0);
  assert.equal(accountSaveCalls, 0);
});

test('transaction update recalculates the same account balance after rollback', async () => {
  let transactionSaveCalls = 0;
  const { store } = installAccountStore([
    { _id: accountId, coupleId, balance: 70 }
  ]);

  Transaction.findById = async () => createTransaction({
    async save() {
      transactionSaveCalls += 1;
    }
  });

  const response = await fetch(`${baseUrl}/api/budget/transactions/${transactionId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ amount: 50 })
  });

  assert.equal(response.status, 200);
  assert.equal(transactionSaveCalls, 1);
  assert.equal(store.get(accountId).balance, 50);
});

test('transaction deletion does not rollback a legacy foreign account reference', async () => {
  const { accountQueries } = installAccountStore([
    { _id: foreignAccountId, coupleId: '333333333333333333333333_444444444444444444444444', balance: 100 }
  ]);
  let deleteCalls = 0;

  Transaction.findById = async () => createTransaction({ accountId: foreignAccountId });
  Transaction.deleteOne = async () => {
    deleteCalls += 1;
  };

  const response = await fetch(`${baseUrl}/api/budget/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });

  assert.equal(response.status, 200);
  assert.equal(deleteCalls, 1);
  assert.deepEqual(accountQueries[0], { _id: foreignAccountId, coupleId });
});
