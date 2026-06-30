const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, Food } = require('../models');
const foodRoutes = require('../routes/food');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const foodId = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let events;
let callOrder;
let originalUserFindById;
let originalFoodFindOne;
let originalFoodFindOneAndUpdate;
let originalFoodDeleteOne;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    callOrder.push('broadcast');
    events.push({ coupleId: targetCoupleId, message });
  };
  app.use('/api/foods', foodRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalFoodFindOne = Food.findOne;
  originalFoodFindOneAndUpdate = Food.findOneAndUpdate;
  originalFoodDeleteOne = Food.deleteOne;
});

test.after(async () => {
  User.findById = originalUserFindById;
  Food.findOne = originalFoodFindOne;
  Food.findOneAndUpdate = originalFoodFindOneAndUpdate;
  Food.deleteOne = originalFoodDeleteOne;
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
  Food.findOne = async (query) => {
    assert.deepEqual(query, { _id: foodId, coupleId });
    return {
      _id: foodId,
      coupleId,
      createdBy: userId,
      restaurant: '街角小馆'
    };
  };
  Food.findOneAndUpdate = originalFoodFindOneAndUpdate;
  Food.deleteOne = originalFoodDeleteOne;
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

test('food update rejects partner-created record without updating or broadcasting', async () => {
  Food.findOne = async (query) => {
    assert.deepEqual(query, { _id: foodId, coupleId });
    return {
      _id: foodId,
      coupleId,
      createdBy: partnerId,
      restaurant: '街角小馆'
    };
  };
  Food.findOneAndUpdate = async () => {
    callOrder.push('update');
    return null;
  };

  const response = await fetch(`${baseUrl}/api/foods/${foodId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ restaurant: '新名字', requestId: 'food-update-partner-owned' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '只能修改自己创建的美食记录');
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
});

test('food update emits sync only after owner-scoped database update succeeds', async () => {
  Food.findOneAndUpdate = async (query, update, options) => {
    callOrder.push('update');
    assert.deepEqual(query, { _id: foodId, coupleId, createdBy: userId });
    assert.deepEqual(update, { $set: { restaurant: '新名字' } });
    assert.deepEqual(options, { new: true });
    return {
      _id: foodId,
      createdBy: userId,
      restaurant: '新名字'
    };
  };

  const response = await fetch(`${baseUrl}/api/foods/${foodId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ restaurant: '新名字', createdBy: partnerId, requestId: 'food-update' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['update', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.type, 'foodSync');
  assert.equal(events[0].message.data.action, 'update');
  assert.equal(events[0].message.data.payload.restaurant, '新名字');
  assert.equal(events[0].message.data.payload.createdBy, undefined);
  assert.equal(events[0].message.data.requestId, 'food-update');
});

test('food delete emits sync only after owner-scoped database delete succeeds', async () => {
  Food.deleteOne = async (query) => {
    callOrder.push('delete');
    assert.deepEqual(query, { _id: foodId, coupleId, createdBy: userId });
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/foods/${foodId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'food-delete' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['delete', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'foodSync');
  assert.equal(events[0].message.data.action, 'delete');
  assert.equal(events[0].message.data.requestId, 'food-delete');
});

test('food delete rejects partner-created record without deleting or broadcasting', async () => {
  Food.findOne = async (query) => {
    assert.deepEqual(query, { _id: foodId, coupleId });
    return {
      _id: foodId,
      coupleId,
      createdBy: partnerId,
      restaurant: '街角小馆'
    };
  };
  Food.deleteOne = async () => {
    callOrder.push('delete');
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/foods/${foodId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'food-delete-partner-owned' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '只能删除自己创建的美食记录');
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
});

test('food delete does not emit sync when database delete fails', async () => {
  Food.deleteOne = async () => {
    callOrder.push('delete');
    throw new Error('delete failed');
  };

  const response = await fetch(`${baseUrl}/api/foods/${foodId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'food-delete-failed' })
  });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
});

test('food delete does not emit sync when nothing is deleted', async () => {
  Food.deleteOne = async () => {
    callOrder.push('delete');
    return { deletedCount: 0 };
  };

  const response = await fetch(`${baseUrl}/api/foods/${foodId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'food-delete-stale' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
});
