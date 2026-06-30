const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, PickupLocation } = require('../models');
const pickupLocationRoutes = require('../routes/pickupLocation');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const locationId = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let callOrder;
let originalUserFindById;
let originalLocationFindOne;
let originalLocationFindOneAndUpdate;
let originalLocationDeleteOne;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/pickup-locations', pickupLocationRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalLocationFindOne = PickupLocation.findOne;
  originalLocationFindOneAndUpdate = PickupLocation.findOneAndUpdate;
  originalLocationDeleteOne = PickupLocation.deleteOne;
});

test.after(async () => {
  User.findById = originalUserFindById;
  PickupLocation.findOne = originalLocationFindOne;
  PickupLocation.findOneAndUpdate = originalLocationFindOneAndUpdate;
  PickupLocation.deleteOne = originalLocationDeleteOne;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test.beforeEach(() => {
  callOrder = [];
  User.findById = async () => ({
    _id: userId,
    partnerId,
    nickname: '小赴'
  });
  PickupLocation.findOne = async (query) => {
    if (query.name) {
      return null;
    }
    assert.deepEqual(query, { _id: locationId, coupleId });
    return makeLocation({ createdBy: userId });
  };
  PickupLocation.findOneAndUpdate = originalLocationFindOneAndUpdate;
  PickupLocation.deleteOne = originalLocationDeleteOne;
});

function makeLocation(overrides = {}) {
  return {
    _id: locationId,
    coupleId,
    name: '南门',
    createdBy: userId,
    ...overrides
  };
}

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

test('pickup location update rejects partner-created location without updating', async () => {
  PickupLocation.findOne = async (query) => {
    if (query.name) {
      return null;
    }
    assert.deepEqual(query, { _id: locationId, coupleId });
    return makeLocation({ createdBy: partnerId });
  };
  PickupLocation.findOneAndUpdate = async () => {
    callOrder.push('update');
    return null;
  };

  const response = await fetch(`${baseUrl}/api/pickup-locations/${locationId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ name: '北门' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '只能修改自己创建的地点');
  assert.deepEqual(callOrder, []);
});

test('pickup location update uses creator-scoped database update', async () => {
  PickupLocation.findOneAndUpdate = async (query, update, options) => {
    callOrder.push('update');
    assert.deepEqual(query, { _id: locationId, coupleId, createdBy: userId });
    assert.deepEqual(update, { name: '北门' });
    assert.deepEqual(options, { new: true });
    return makeLocation({ name: '北门' });
  };

  const response = await fetch(`${baseUrl}/api/pickup-locations/${locationId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ name: '北门', createdBy: partnerId })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['update']);
  assert.equal(body.data.name, '北门');
  assert.equal(body.data.createdBy, userId);
});

test('pickup location update fails cleanly when creator-scoped update finds nothing', async () => {
  PickupLocation.findOneAndUpdate = async () => {
    callOrder.push('update');
    return null;
  };

  const response = await fetch(`${baseUrl}/api/pickup-locations/${locationId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ name: '北门' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['update']);
});

test('pickup location delete rejects partner-created location without deleting', async () => {
  PickupLocation.findOne = async (query) => {
    assert.deepEqual(query, { _id: locationId, coupleId });
    return makeLocation({ createdBy: partnerId });
  };
  PickupLocation.deleteOne = async () => {
    callOrder.push('delete');
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/pickup-locations/${locationId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '只能删除自己创建的地点');
  assert.deepEqual(callOrder, []);
});

test('pickup location delete uses creator-scoped database delete', async () => {
  PickupLocation.deleteOne = async (query) => {
    callOrder.push('delete');
    assert.deepEqual(query, { _id: locationId, coupleId, createdBy: userId });
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/pickup-locations/${locationId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['delete']);
});

test('pickup location delete fails cleanly when creator-scoped delete finds nothing', async () => {
  PickupLocation.deleteOne = async () => {
    callOrder.push('delete');
    return { deletedCount: 0 };
  };

  const response = await fetch(`${baseUrl}/api/pickup-locations/${locationId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
});
