const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, Wish } = require('../models');
const wishRoutes = require('../routes/wishes');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const wishId = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let events;
let notifications;
let callOrder;
let originalUserFindById;
let originalWishFindOne;
let originalWishDeleteOne;

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
  app.use('/api/wishes', wishRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalWishFindOne = Wish.findOne;
  originalWishDeleteOne = Wish.deleteOne;
});

test.after(async () => {
  User.findById = originalUserFindById;
  Wish.findOne = originalWishFindOne;
  Wish.deleteOne = originalWishDeleteOne;
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
  Wish.findOne = async (query) => {
    assert.deepEqual(query, { _id: wishId, coupleId });
    return {
      _id: wishId,
      coupleId,
      createdBy: userId,
      title: '周末露营'
    };
  };
  Wish.deleteOne = originalWishDeleteOne;
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

test('wish delete emits sync only after database delete succeeds', async () => {
  Wish.deleteOne = async (query) => {
    callOrder.push('delete');
    assert.deepEqual(query, { _id: wishId, coupleId, createdBy: userId });
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/wishes/${wishId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'wish-delete' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['delete', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'wishSync');
  assert.equal(events[0].message.data.action, 'delete');
  assert.equal(events[0].message.data.requestId, 'wish-delete');
  assert.equal(notifications.length, 0);
});

test('wish delete rejects partner-owned wish without deleting or notifying', async () => {
  Wish.findOne = async (query) => {
    assert.deepEqual(query, { _id: wishId, coupleId });
    return {
      _id: wishId,
      coupleId,
      createdBy: partnerId,
      title: '周末露营'
    };
  };
  Wish.deleteOne = async () => {
    callOrder.push('delete');
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/wishes/${wishId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'wish-delete-partner-owned' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '只能删除自己创建的心愿');
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('wish delete does not emit sync or push when database delete fails', async () => {
  Wish.deleteOne = async () => {
    callOrder.push('delete');
    throw new Error('delete failed');
  };

  const response = await fetch(`${baseUrl}/api/wishes/${wishId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'wish-delete-failed' })
  });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('wish delete does not emit sync or push when nothing is deleted', async () => {
  Wish.deleteOne = async () => {
    callOrder.push('delete');
    return { deletedCount: 0 };
  };

  const response = await fetch(`${baseUrl}/api/wishes/${wishId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'wish-delete-stale' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});
