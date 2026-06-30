const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User } = require('../models');
const Account = require('../models/Account');
const accountRoutes = require('../routes/accounts');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const accountId = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let events;
let callOrder;
let originalUserFindById;
let originalAccountFindById;
let originalAccountDeleteOne;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    callOrder.push('broadcast');
    events.push({ coupleId: targetCoupleId, message });
  };
  app.use('/api/accounts', accountRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalAccountFindById = Account.findById;
  originalAccountDeleteOne = Account.deleteOne;
});

test.after(async () => {
  User.findById = originalUserFindById;
  Account.findById = originalAccountFindById;
  Account.deleteOne = originalAccountDeleteOne;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test.beforeEach(() => {
  events = [];
  callOrder = [];
  User.findById = async () => ({
    _id: userId,
    partnerId,
    nickname: '小赴'
  });
  Account.findById = async (id) => {
    assert.equal(id, accountId);
    return {
      _id: accountId,
      userId,
      coupleId,
      name: '现金',
      save: async () => {}
    };
  };
  Account.deleteOne = originalAccountDeleteOne;
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

test('account delete emits sync only after database delete succeeds', async () => {
  Account.deleteOne = async (query) => {
    callOrder.push('delete');
    assert.deepEqual(query, { _id: accountId, coupleId, userId });
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/accounts/${accountId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['delete', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'accountSync');
  assert.equal(events[0].message.data.action, 'accountDelete');
});

test('account update rejects partner-owned account without saving or broadcasting', async () => {
  let saveCalls = 0;

  Account.findById = async (id) => {
    assert.equal(id, accountId);
    return {
      _id: accountId,
      userId: partnerId,
      coupleId,
      name: '伴侣银行卡',
      save: async () => {
        saveCalls += 1;
      }
    };
  };

  const response = await fetch(`${baseUrl}/api/accounts/${accountId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ name: '改名' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(saveCalls, 0);
  assert.equal(events.length, 0);
});

test('account delete rejects partner-owned account without deleting or broadcasting', async () => {
  let deleteCalls = 0;

  Account.findById = async (id) => {
    assert.equal(id, accountId);
    return {
      _id: accountId,
      userId: partnerId,
      coupleId,
      name: '伴侣银行卡'
    };
  };
  Account.deleteOne = async () => {
    deleteCalls += 1;
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/accounts/${accountId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(deleteCalls, 0);
  assert.equal(events.length, 0);
});

test('account delete does not emit sync when database delete fails', async () => {
  Account.deleteOne = async () => {
    callOrder.push('delete');
    throw new Error('delete failed');
  };

  const response = await fetch(`${baseUrl}/api/accounts/${accountId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
});

test('account delete does not emit sync when nothing is deleted', async () => {
  Account.deleteOne = async () => {
    callOrder.push('delete');
    return { deletedCount: 0 };
  };

  const response = await fetch(`${baseUrl}/api/accounts/${accountId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
});
