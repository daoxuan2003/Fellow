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

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const coupleId = [userId, partnerId].sort().join('_');
const foreignAccountId = '333333333333333333333333';
const transactionId = '444444444444444444444444';

let server;
let baseUrl;
let events;
let originalUserFindById;
let originalAccountFindOne;
let originalTransactionFindById;
let originalTransactionDeleteOne;
let originalTransactionSave;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    events.push({ coupleId: targetCoupleId, message });
  };
  app.use('/api/budget', budgetRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalAccountFindOne = Account.findOne;
  originalTransactionFindById = Transaction.findById;
  originalTransactionDeleteOne = Transaction.deleteOne;
  originalTransactionSave = Transaction.prototype.save;
});

test.after(async () => {
  User.findById = originalUserFindById;
  Account.findOne = originalAccountFindOne;
  Transaction.findById = originalTransactionFindById;
  Transaction.deleteOne = originalTransactionDeleteOne;
  Transaction.prototype.save = originalTransactionSave;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test.beforeEach(() => {
  events = [];
  User.findById = async (id) => ({
    _id: id,
    partnerId,
    nickname: id === partnerId ? '伴侣' : '小赴'
  });
  Account.findOne = originalAccountFindOne;
  Transaction.findById = originalTransactionFindById;
  Transaction.deleteOne = originalTransactionDeleteOne;
  Transaction.prototype.save = originalTransactionSave;
});

function authHeaders() {
  const token = jwt.sign({ userId, account: 'viewer' }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '5m'
  });
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

test('transaction create rejects account ids outside the authenticated couple', async () => {
  const accountQueries = [];
  let transactionSaveCalls = 0;

  Account.findOne = async (query) => {
    accountQueries.push(query);
    return null;
  };
  Transaction.prototype.save = async function save() {
    transactionSaveCalls += 1;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/budget/transactions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      type: 'expense',
      amount: 42,
      category: '餐饮',
      accountId: foreignAccountId,
      date: '2026-06-29'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, '请选择当前情侣账本中的账户');
  assert.equal(transactionSaveCalls, 0);
  assert.equal(events.length, 0);
  assert.deepEqual(accountQueries, [{ _id: foreignAccountId, coupleId }]);
});

test('transaction delete does not roll back a legacy foreign account reference', async () => {
  const accountQueries = [];
  let accountSaveCalls = 0;
  let deleteQuery;

  Transaction.findById = async (id) => {
    assert.equal(id, transactionId);
    return {
      _id: transactionId,
      coupleId,
      type: 'expense',
      amount: 25,
      accountId: foreignAccountId,
      toAccountId: null
    };
  };
  Transaction.deleteOne = async (query) => {
    deleteQuery = query;
    return { deletedCount: 1 };
  };
  Account.findOne = async (query) => {
    accountQueries.push(query);
    if (query._id === foreignAccountId && query.coupleId === 'foreign_couple') {
      return {
        _id: foreignAccountId,
        coupleId: 'foreign_couple',
        balance: 100,
        save: async () => {
          accountSaveCalls += 1;
        }
      };
    }
    return null;
  };

  const response = await fetch(`${baseUrl}/api/budget/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(accountSaveCalls, 0);
  assert.deepEqual(deleteQuery, { _id: transactionId, coupleId });
  assert.deepEqual(accountQueries, [{ _id: foreignAccountId, coupleId }]);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.type, 'budgetSync');
});
