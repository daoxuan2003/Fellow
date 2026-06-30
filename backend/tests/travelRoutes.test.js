const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, Travel } = require('../models');
const travelRoutes = require('../routes/travel');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const travelId = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let events;
let callOrder;
let originalUserFindById;
let originalTravelFindOne;
let originalTravelFindOneAndUpdate;
let originalTravelDeleteOne;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    callOrder.push('broadcast');
    events.push({ coupleId: targetCoupleId, message });
  };
  app.use('/api/travels', travelRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalTravelFindOne = Travel.findOne;
  originalTravelFindOneAndUpdate = Travel.findOneAndUpdate;
  originalTravelDeleteOne = Travel.deleteOne;
});

test.after(async () => {
  User.findById = originalUserFindById;
  Travel.findOne = originalTravelFindOne;
  Travel.findOneAndUpdate = originalTravelFindOneAndUpdate;
  Travel.deleteOne = originalTravelDeleteOne;
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
  Travel.findOne = async (query) => {
    assert.deepEqual(query, { _id: travelId, coupleId });
    return {
      _id: travelId,
      coupleId,
      createdBy: userId,
      city: '杭州'
    };
  };
  Travel.findOneAndUpdate = originalTravelFindOneAndUpdate;
  Travel.deleteOne = originalTravelDeleteOne;
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

test('travel update rejects partner-created record without updating or broadcasting', async () => {
  Travel.findOne = async (query) => {
    assert.deepEqual(query, { _id: travelId, coupleId });
    return {
      _id: travelId,
      coupleId,
      createdBy: partnerId,
      city: '杭州'
    };
  };
  Travel.findOneAndUpdate = async () => {
    callOrder.push('update');
    return null;
  };

  const response = await fetch(`${baseUrl}/api/travels/${travelId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ city: '苏州', requestId: 'travel-update-partner-owned' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '只能修改自己创建的旅行记录');
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
});

test('travel update emits sync only after owner-scoped database update succeeds', async () => {
  Travel.findOneAndUpdate = async (query, update, options) => {
    callOrder.push('update');
    assert.deepEqual(query, { _id: travelId, coupleId, createdBy: userId });
    assert.deepEqual(update, { $set: { city: '苏州' } });
    assert.deepEqual(options, { new: true });
    return {
      _id: travelId,
      createdBy: userId,
      city: '苏州'
    };
  };

  const response = await fetch(`${baseUrl}/api/travels/${travelId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ city: '苏州', createdBy: partnerId, requestId: 'travel-update' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['update', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.type, 'travelSync');
  assert.equal(events[0].message.data.action, 'update');
  assert.equal(events[0].message.data.payload.city, '苏州');
  assert.equal(events[0].message.data.payload.createdBy, undefined);
  assert.equal(events[0].message.data.requestId, 'travel-update');
});

test('travel delete emits sync only after owner-scoped database delete succeeds', async () => {
  Travel.deleteOne = async (query) => {
    callOrder.push('delete');
    assert.deepEqual(query, { _id: travelId, coupleId, createdBy: userId });
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/travels/${travelId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'travel-delete' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['delete', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'travelSync');
  assert.equal(events[0].message.data.action, 'delete');
  assert.equal(events[0].message.data.requestId, 'travel-delete');
});

test('travel delete rejects partner-created record without deleting or broadcasting', async () => {
  Travel.findOne = async (query) => {
    assert.deepEqual(query, { _id: travelId, coupleId });
    return {
      _id: travelId,
      coupleId,
      createdBy: partnerId,
      city: '杭州'
    };
  };
  Travel.deleteOne = async () => {
    callOrder.push('delete');
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/travels/${travelId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'travel-delete-partner-owned' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '只能删除自己创建的旅行记录');
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
});

test('travel delete does not emit sync when database delete fails', async () => {
  Travel.deleteOne = async () => {
    callOrder.push('delete');
    throw new Error('delete failed');
  };

  const response = await fetch(`${baseUrl}/api/travels/${travelId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'travel-delete-failed' })
  });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
});

test('travel delete does not emit sync when nothing is deleted', async () => {
  Travel.deleteOne = async () => {
    callOrder.push('delete');
    return { deletedCount: 0 };
  };

  const response = await fetch(`${baseUrl}/api/travels/${travelId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'travel-delete-stale' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
});
