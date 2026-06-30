const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User } = require('../models');
const Account = require('../models/Account');
const { Transaction, NetWorth } = require('../models/Budget');
const budgetRoutes = require('../routes/budget');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const coupleId = [userId, partnerId].sort().join('_');
const foreignAccountId = '333333333333333333333333';
const transactionId = '444444444444444444444444';
const netWorthId = '555555555555555555555555';

let server;
let baseUrl;
let events;
let originalUserFindById;
let originalAccountFindOne;
let originalTransactionFindById;
let originalTransactionDeleteOne;
let originalTransactionSave;
let originalNetWorthFindById;
let originalNetWorthDeleteOne;

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
  originalNetWorthFindById = NetWorth.findById;
  originalNetWorthDeleteOne = NetWorth.deleteOne;
});

test.after(async () => {
  User.findById = originalUserFindById;
  Account.findOne = originalAccountFindOne;
  Transaction.findById = originalTransactionFindById;
  Transaction.deleteOne = originalTransactionDeleteOne;
  Transaction.prototype.save = originalTransactionSave;
  NetWorth.findById = originalNetWorthFindById;
  NetWorth.deleteOne = originalNetWorthDeleteOne;
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
  NetWorth.findById = originalNetWorthFindById;
  NetWorth.deleteOne = originalNetWorthDeleteOne;
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

test('transaction create rejects account ids outside the authenticated user accounts', async () => {
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
  assert.equal(body.message, '请选择自己的账户');
  assert.equal(transactionSaveCalls, 0);
  assert.equal(events.length, 0);
  assert.deepEqual(accountQueries, [{ _id: foreignAccountId, coupleId, userId }]);
});

test('transaction update rejects partner account references before saving', async () => {
  const accountQueries = [];
  let saveCalls = 0;

  Transaction.findById = async (id) => {
    assert.equal(id, transactionId);
    return {
      _id: transactionId,
      coupleId,
      creatorId: userId,
      type: 'expense',
      amount: 25,
      accountId: null,
      toAccountId: null,
      category: '餐饮',
      date: new Date('2026-06-29'),
      note: '',
      save: async () => {
        saveCalls += 1;
      }
    };
  };
  Account.findOne = async (query) => {
    accountQueries.push(query);
    return null;
  };

  const response = await fetch(`${baseUrl}/api/budget/transactions/${transactionId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      type: 'expense',
      amount: 66,
      category: '餐饮',
      accountId: foreignAccountId,
      date: '2026-06-29'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, '请选择自己的账户');
  assert.equal(saveCalls, 0);
  assert.deepEqual(accountQueries, [{ _id: foreignAccountId, coupleId, userId }]);
  assert.equal(events.length, 0);
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
      creatorId: userId,
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
  assert.deepEqual(deleteQuery, { _id: transactionId, coupleId, creatorId: userId });
  assert.deepEqual(accountQueries, [{ _id: foreignAccountId, coupleId }]);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.type, 'budgetSync');
});

test('transaction update rejects partner-created record without saving or touching accounts', async () => {
  let saveCalls = 0;
  const accountQueries = [];

  Transaction.findById = async (id) => {
    assert.equal(id, transactionId);
    return {
      _id: transactionId,
      coupleId,
      creatorId: partnerId,
      type: 'expense',
      amount: 25,
      accountId: null,
      toAccountId: null,
      category: '餐饮',
      note: '',
      save: async () => {
        saveCalls += 1;
      }
    };
  };
  Account.findOne = async (query) => {
    accountQueries.push(query);
    return null;
  };

  const response = await fetch(`${baseUrl}/api/budget/transactions/${transactionId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      type: 'expense',
      amount: 66,
      category: '餐饮',
      date: '2026-06-29'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(saveCalls, 0);
  assert.deepEqual(accountQueries, []);
  assert.equal(events.length, 0);
});

test('transaction delete rejects partner-created record without deleting or touching accounts', async () => {
  let deleteCalls = 0;
  const accountQueries = [];

  Transaction.findById = async (id) => {
    assert.equal(id, transactionId);
    return {
      _id: transactionId,
      coupleId,
      creatorId: partnerId,
      type: 'expense',
      amount: 25,
      accountId: foreignAccountId,
      toAccountId: null
    };
  };
  Transaction.deleteOne = async () => {
    deleteCalls += 1;
    return { deletedCount: 1 };
  };
  Account.findOne = async (query) => {
    accountQueries.push(query);
    return null;
  };

  const response = await fetch(`${baseUrl}/api/budget/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(deleteCalls, 0);
  assert.deepEqual(accountQueries, []);
  assert.equal(events.length, 0);
});

test('transaction delete does not roll back accounts when creator-scoped delete finds nothing', async () => {
  const accountQueries = [];

  Transaction.findById = async (id) => {
    assert.equal(id, transactionId);
    return {
      _id: transactionId,
      coupleId,
      creatorId: userId,
      type: 'expense',
      amount: 25,
      accountId: foreignAccountId,
      toAccountId: null
    };
  };
  Transaction.deleteOne = async (query) => {
    assert.deepEqual(query, { _id: transactionId, coupleId, creatorId: userId });
    return { deletedCount: 0 };
  };
  Account.findOne = async (query) => {
    accountQueries.push(query);
    return null;
  };

  const response = await fetch(`${baseUrl}/api/budget/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(accountQueries, []);
  assert.equal(events.length, 0);
});

test('net worth update rejects partner-owned snapshot without saving or broadcasting', async () => {
  let saveCalls = 0;

  NetWorth.findById = async (id) => {
    assert.equal(id, netWorthId);
    return {
      _id: netWorthId,
      coupleId,
      userId: partnerId,
      amount: 1000,
      save: async () => {
        saveCalls += 1;
      }
    };
  };

  const response = await fetch(`${baseUrl}/api/budget/networth/${netWorthId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ amount: 2000 })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(saveCalls, 0);
  assert.equal(events.length, 0);
});

test('net worth delete rejects partner-owned snapshot without deleting or broadcasting', async () => {
  let deleteCalls = 0;

  NetWorth.findById = async (id) => {
    assert.equal(id, netWorthId);
    return {
      _id: netWorthId,
      coupleId,
      userId: partnerId,
      amount: 1000
    };
  };
  NetWorth.deleteOne = async () => {
    deleteCalls += 1;
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/budget/networth/${netWorthId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(deleteCalls, 0);
  assert.equal(events.length, 0);
});

test('net worth delete does not broadcast when user-scoped delete finds nothing', async () => {
  NetWorth.findById = async (id) => {
    assert.equal(id, netWorthId);
    return {
      _id: netWorthId,
      coupleId,
      userId,
      amount: 1000
    };
  };
  NetWorth.deleteOne = async (query) => {
    assert.deepEqual(query, { _id: netWorthId, coupleId, userId });
    return { deletedCount: 0 };
  };

  const response = await fetch(`${baseUrl}/api/budget/networth/${netWorthId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(events.length, 0);
});
