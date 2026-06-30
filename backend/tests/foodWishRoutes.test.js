const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, FoodWish } = require('../models');
const foodWishRoutes = require('../routes/foodWish');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const wishId = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let events;
let callOrder;
let originalUserFindById;
let originalFoodWishFindOne;
let originalFoodWishDeleteOne;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    callOrder.push('broadcast');
    events.push({ coupleId: targetCoupleId, message });
  };
  app.use('/api/food-wishes', foodWishRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalFoodWishFindOne = FoodWish.findOne;
  originalFoodWishDeleteOne = FoodWish.deleteOne;
});

test.after(async () => {
  User.findById = originalUserFindById;
  FoodWish.findOne = originalFoodWishFindOne;
  FoodWish.deleteOne = originalFoodWishDeleteOne;
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
  FoodWish.findOne = async (query) => {
    assert.deepEqual(query, { _id: wishId, coupleId });
    return {
      _id: wishId,
      coupleId,
      createdBy: userId,
      restaurant: '街角小馆'
    };
  };
  FoodWish.deleteOne = originalFoodWishDeleteOne;
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

test('food wish delete emits sync only after database delete succeeds', async () => {
  FoodWish.deleteOne = async (query) => {
    callOrder.push('delete');
    assert.deepEqual(query, { _id: wishId, coupleId, createdBy: userId });
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/food-wishes/${wishId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'food-wish-delete' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['delete', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'foodWishSync');
  assert.equal(events[0].message.data.action, 'delete');
  assert.equal(events[0].message.data.requestId, 'food-wish-delete');
});

test('food wish delete rejects partner-owned wish without deleting or broadcasting', async () => {
  FoodWish.findOne = async (query) => {
    assert.deepEqual(query, { _id: wishId, coupleId });
    return {
      _id: wishId,
      coupleId,
      createdBy: partnerId,
      restaurant: '街角小馆'
    };
  };
  FoodWish.deleteOne = async () => {
    callOrder.push('delete');
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/food-wishes/${wishId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'food-wish-delete-partner-owned' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '只能删除自己添加的想吃');
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
});

test('food wish delete does not emit sync when database delete fails', async () => {
  FoodWish.deleteOne = async () => {
    callOrder.push('delete');
    throw new Error('delete failed');
  };

  const response = await fetch(`${baseUrl}/api/food-wishes/${wishId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'food-wish-delete-failed' })
  });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
});

test('food wish delete does not emit sync when nothing is deleted', async () => {
  FoodWish.deleteOne = async () => {
    callOrder.push('delete');
    return { deletedCount: 0 };
  };

  const response = await fetch(`${baseUrl}/api/food-wishes/${wishId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'food-wish-delete-stale' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
});
