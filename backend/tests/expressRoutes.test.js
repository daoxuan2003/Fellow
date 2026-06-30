const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, ExpressDelivery } = require('../models');
const expressRoutes = require('../routes/express');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const deliveryId = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let events;
let notifications;
let callOrder;
let originalUserFindById;
let originalDeliveryFindById;
let originalDeliveryDeleteOne;
let originalDeliveryFindOneAndUpdate;

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
  app.use('/api/express', expressRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalDeliveryFindById = ExpressDelivery.findById;
  originalDeliveryDeleteOne = ExpressDelivery.deleteOne;
  originalDeliveryFindOneAndUpdate = ExpressDelivery.findOneAndUpdate;
});

test.after(async () => {
  User.findById = originalUserFindById;
  ExpressDelivery.findById = originalDeliveryFindById;
  ExpressDelivery.deleteOne = originalDeliveryDeleteOne;
  ExpressDelivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate;
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
  ExpressDelivery.findById = async () => ({
    _id: deliveryId,
    requesterId: userId,
    coupleId,
    description: '资料袋',
    trackingNo: 'A1',
    pickupLocation: '南门',
    priority: 'normal',
    status: 'pending'
  });
  ExpressDelivery.deleteOne = originalDeliveryDeleteOne;
  ExpressDelivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate;
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

test('express delete emits realtime updates only after database delete succeeds', async () => {
  ExpressDelivery.deleteOne = async (query) => {
    callOrder.push('delete');
    assert.deepEqual(query, { _id: deliveryId, coupleId, requesterId: userId });
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/express/${deliveryId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'express-delete' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['delete', 'broadcast', 'push']);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'expressSync');
  assert.equal(events[0].message.data.requestId, 'express-delete');
  assert.equal(notifications.length, 1);
});

test('express delete rejects partner requested delivery without deleting or notifying', async () => {
  ExpressDelivery.findById = async () => ({
    _id: deliveryId,
    requesterId: partnerId,
    coupleId,
    description: '资料袋',
    status: 'pending'
  });
  ExpressDelivery.deleteOne = async () => {
    callOrder.push('delete');
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/express/${deliveryId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'partner-delete' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '只有创建者才能删除');
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('express delete requires the delivery to belong to the current relationship', async () => {
  let deleteCalls = 0;
  ExpressDelivery.findById = async () => ({
    _id: deliveryId,
    requesterId: userId,
    coupleId: '333333333333333333333333_444444444444444444444444',
    description: '旧快递',
    status: 'pending'
  });
  ExpressDelivery.deleteOne = async () => {
    deleteCalls += 1;
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/express/${deliveryId}`, {
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

test('express edit rejects partner requested delivery without updating or broadcasting', async () => {
  ExpressDelivery.findById = async () => ({
    _id: deliveryId,
    requesterId: partnerId,
    coupleId,
    description: '资料袋',
    status: 'pending'
  });
  ExpressDelivery.findOneAndUpdate = async () => {
    callOrder.push('update');
    return null;
  };

  const response = await fetch(`${baseUrl}/api/express/${deliveryId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ trackingNo: 'B2', requestId: 'partner-edit' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '只有创建者才能编辑');
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('express edit emits sync only after requester-scoped update succeeds', async () => {
  ExpressDelivery.findOneAndUpdate = async (query, update, options) => {
    callOrder.push('update');
    assert.deepEqual(query, { _id: deliveryId, coupleId, requesterId: userId, status: 'pending' });
    assert.deepEqual(update, {
      $set: {
        trackingNo: 'B2',
        pickupLocation: '北门',
        description: '资料袋更新',
        priority: 'urgent'
      }
    });
    assert.deepEqual(options, { new: true });
    return {
      _id: deliveryId,
      requesterId: userId,
      pickerId: null,
      coupleId,
      trackingNo: 'B2',
      pickupLocation: '北门',
      description: '资料袋更新',
      priority: 'urgent',
      status: 'pending',
      createdAt: new Date('2026-06-30T00:00:00.000Z')
    };
  };

  const response = await fetch(`${baseUrl}/api/express/${deliveryId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      trackingNo: 'B2',
      pickupLocation: '北门',
      description: '资料袋更新',
      priority: 'urgent',
      requesterId: partnerId,
      requestId: 'express-edit'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['update', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'expressSync');
  assert.equal(events[0].message.data.action, 'update');
  assert.equal(events[0].message.data.payload.trackingNo, 'B2');
  assert.equal(events[0].message.data.payload.requesterId, undefined);
  assert.equal(events[0].message.data.requestId, 'express-edit');
  assert.equal(body.data.requesterId, userId);
});

test('express edit does not emit sync when requester-scoped update finds nothing', async () => {
  ExpressDelivery.findOneAndUpdate = async () => {
    callOrder.push('update');
    return null;
  };

  const response = await fetch(`${baseUrl}/api/express/${deliveryId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ trackingNo: 'B2', requestId: 'stale-edit' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['update']);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});
