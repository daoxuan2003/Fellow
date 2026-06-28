const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, ShoppingItem } = require('../models');
const shoppingRoutes = require('../routes/shopping');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const itemId = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let events;
let notifications;
let callOrder;
let originalUserFindById;
let originalItemFindById;
let originalItemDeleteOne;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    callOrder.push('broadcast');
    events.push({ coupleId: targetCoupleId, message });
  };
  app.locals.sendNotification = (...args) => {
    callOrder.push('push');
    notifications.push(args);
  };
  app.use('/api/shopping', shoppingRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalItemFindById = ShoppingItem.findById;
  originalItemDeleteOne = ShoppingItem.deleteOne;
});

test.after(async () => {
  User.findById = originalUserFindById;
  ShoppingItem.findById = originalItemFindById;
  ShoppingItem.deleteOne = originalItemDeleteOne;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test.beforeEach(() => {
  events = [];
  notifications = [];
  callOrder = [];
  User.findById = async () => ({
    _id: userId,
    partnerId,
    nickname: '小赴'
  });
  ShoppingItem.findById = async () => ({
    _id: itemId,
    createdBy: userId,
    coupleId,
    name: '牛奶',
    listName: '超市',
    listOwnership: 'both'
  });
  ShoppingItem.deleteOne = originalItemDeleteOne;
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

test('shopping item delete emits sync and push only after database delete succeeds', async () => {
  ShoppingItem.deleteOne = async (query) => {
    callOrder.push('delete');
    assert.deepEqual(query, { _id: itemId, coupleId });
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/shopping/${itemId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'delete-request' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['delete', 'broadcast', 'push']);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'shoppingSync');
  assert.equal(events[0].message.data.action, 'delete');
  assert.equal(events[0].message.data.requestId, 'delete-request');
  assert.equal(notifications.length, 1);
});

test('shopping item delete does not emit sync or push when database delete fails', async () => {
  ShoppingItem.deleteOne = async () => {
    callOrder.push('delete');
    throw new Error('delete failed');
  };

  const response = await fetch(`${baseUrl}/api/shopping/${itemId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'failed-delete' })
  });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('shopping item delete does not emit sync or push when nothing is deleted', async () => {
  ShoppingItem.deleteOne = async () => {
    callOrder.push('delete');
    return { deletedCount: 0 };
  };

  const response = await fetch(`${baseUrl}/api/shopping/${itemId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'stale-delete' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('shopping item delete requires the current couple relationship', async () => {
  let deleteCalls = 0;
  ShoppingItem.findById = async () => ({
    _id: itemId,
    createdBy: userId,
    coupleId: '333333333333333333333333_444444444444444444444444',
    name: '旧清单物品',
    listName: '',
    listOwnership: 'self'
  });
  ShoppingItem.deleteOne = async () => {
    deleteCalls += 1;
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/shopping/${itemId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(deleteCalls, 0);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});
