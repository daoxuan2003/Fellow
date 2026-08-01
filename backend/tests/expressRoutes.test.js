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
let originalUserFind;
let originalDeliveryFind;
let originalDeliveryFindOne;
let originalDeliveryDeleteOne;
let originalDeliveryFindOneAndUpdate;
let originalDeliveryUpdateMany;

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
  originalUserFind = User.find;
  originalDeliveryFind = ExpressDelivery.find;
  originalDeliveryFindOne = ExpressDelivery.findOne;
  originalDeliveryDeleteOne = ExpressDelivery.deleteOne;
  originalDeliveryFindOneAndUpdate = ExpressDelivery.findOneAndUpdate;
  originalDeliveryUpdateMany = ExpressDelivery.updateMany;
});

test.after(async () => {
  User.findById = originalUserFindById;
  User.find = originalUserFind;
  ExpressDelivery.find = originalDeliveryFind;
  ExpressDelivery.findOne = originalDeliveryFindOne;
  ExpressDelivery.deleteOne = originalDeliveryDeleteOne;
  ExpressDelivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate;
  ExpressDelivery.updateMany = originalDeliveryUpdateMany;
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
  ExpressDelivery.findOne = async () => ({
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
  ExpressDelivery.updateMany = originalDeliveryUpdateMany;
  ExpressDelivery.find = originalDeliveryFind;
  User.find = originalUserFind;
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

test('express list atomically archives picked deliveries before the Shanghai day boundary', async () => {
  let archiveQuery;
  let archiveUpdate;
  let listQuery;
  ExpressDelivery.updateMany = async (query, update) => {
    callOrder.push('archive-old');
    archiveQuery = query;
    archiveUpdate = update;
    return { modifiedCount: 2 };
  };
  ExpressDelivery.find = (query) => {
    listQuery = query;
    return { sort: async () => [] };
  };
  User.find = async () => [];

  const response = await fetch(`${baseUrl}/api/express?archived=all`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(listQuery, { coupleId });
  assert.equal(archiveQuery.coupleId, coupleId);
  assert.equal(archiveQuery.status, 'picked');
  assert.equal(archiveQuery.archivedAt, null);
  assert.ok(archiveQuery.$or[0].pickedAt.$lt instanceof Date);
  assert.equal(archiveQuery.$or[0].pickedAt.$lt.getUTCHours(), 16);
  assert.deepEqual(archiveQuery.$or[1], { pickedAt: null });
  assert.ok(archiveUpdate.$set.archivedAt instanceof Date);
  assert.equal(archiveUpdate.$set.archivedBy, null);
  assert.deepEqual(callOrder, ['archive-old', 'broadcast']);
  assert.equal(events[0].message.data.action, 'autoArchive');
});

test('express delete emits realtime updates only after database delete succeeds', async () => {
  let findQuery;
  ExpressDelivery.findOne = async (query) => {
    findQuery = query;
    return {
      _id: deliveryId,
      requesterId: userId,
      coupleId,
      description: '资料袋',
      status: 'pending'
    };
  };
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
  assert.deepEqual(findQuery, { _id: deliveryId, coupleId });
  assert.deepEqual(callOrder, ['delete', 'broadcast', 'push']);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'expressSync');
  assert.equal(events[0].message.data.requestId, 'express-delete');
  assert.equal(notifications.length, 1);
});

test('express delete rejects partner requested delivery without deleting or notifying', async () => {
  let findQuery;
  ExpressDelivery.findOne = async (query) => {
    findQuery = query;
    return {
      _id: deliveryId,
      requesterId: partnerId,
      coupleId,
      description: '资料袋',
      status: 'pending'
    };
  };
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
  assert.deepEqual(findQuery, { _id: deliveryId, coupleId });
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('express delete does not read deliveries outside the current relationship', async () => {
  let findQuery;
  let deleteCalls = 0;
  ExpressDelivery.findOne = async (query) => {
    findQuery = query;
    return null;
  };
  ExpressDelivery.deleteOne = async () => {
    deleteCalls += 1;
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/express/${deliveryId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(findQuery, { _id: deliveryId, coupleId });
  assert.equal(deleteCalls, 0);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('express edit rejects partner requested delivery without updating or broadcasting', async () => {
  let findQuery;
  ExpressDelivery.findOne = async (query) => {
    findQuery = query;
    return {
      _id: deliveryId,
      requesterId: partnerId,
      coupleId,
      description: '资料袋',
      status: 'pending'
    };
  };
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
  assert.deepEqual(findQuery, { _id: deliveryId, coupleId });
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('express edit emits sync only after requester-scoped update succeeds', async () => {
  let findQuery;
  ExpressDelivery.findOne = async (query) => {
    findQuery = query;
    return {
      _id: deliveryId,
      requesterId: userId,
      coupleId,
      description: '资料袋',
      status: 'pending'
    };
  };
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
  assert.deepEqual(findQuery, { _id: deliveryId, coupleId });
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

test('express pick scopes lookup and atomically claims a pending delivery', async () => {
  let findQuery;
  let updateQuery;
  let updatePayload;
  ExpressDelivery.findOne = async (query) => {
    findQuery = query;
    return {
      _id: deliveryId,
      requesterId: partnerId,
      coupleId,
      description: '资料袋',
      status: 'pending'
    };
  };
  ExpressDelivery.findOneAndUpdate = async (query, update, options) => {
    callOrder.push('update');
    updateQuery = query;
    updatePayload = update;
    assert.deepEqual(options, { new: true });
    return {
      _id: deliveryId,
      requesterId: partnerId,
      coupleId,
      description: '资料袋',
      status: update.$set.status,
      pickerId: update.$set.pickerId,
      pickedAt: update.$set.pickedAt
    };
  };

  const response = await fetch(`${baseUrl}/api/express/${deliveryId}/pick`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'express-pick' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(findQuery, { _id: deliveryId, coupleId });
  assert.deepEqual(updateQuery, { _id: deliveryId, coupleId, status: 'pending' });
  assert.equal(updatePayload.$set.status, 'picked');
  assert.equal(updatePayload.$set.pickerId, userId);
  assert.ok(updatePayload.$set.pickedAt instanceof Date);
  assert.deepEqual(callOrder, ['update', 'broadcast', 'push']);
  assert.equal(events[0].message.data.action, 'pick');
  assert.equal(events[0].message.data.requestId, 'express-pick');
  assert.equal(notifications[0][0], partnerId);
});

test('express pick does not broadcast when the atomic claim loses a race', async () => {
  ExpressDelivery.findOne = async () => ({
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

  const response = await fetch(`${baseUrl}/api/express/${deliveryId}/pick`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'race-pick' })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['update']);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('express unpick scopes lookup and atomically releases only the picker', async () => {
  let findQuery;
  let updateQuery;
  ExpressDelivery.findOne = async (query) => {
    findQuery = query;
    return {
      _id: deliveryId,
      requesterId: partnerId,
      pickerId: userId,
      coupleId,
      description: '资料袋',
      status: 'picked',
      pickedAt: new Date()
    };
  };
  ExpressDelivery.findOneAndUpdate = async (query, update, options) => {
    callOrder.push('update');
    updateQuery = query;
    assert.deepEqual(update, { $set: { status: 'pending', pickerId: null, pickedAt: null, archivedAt: null, archivedBy: null } });
    assert.deepEqual(options, { new: true });
    return {
      _id: deliveryId,
      requesterId: partnerId,
      pickerId: null,
      coupleId,
      description: '资料袋',
      status: 'pending',
      pickedAt: null
    };
  };

  const response = await fetch(`${baseUrl}/api/express/${deliveryId}/unpick`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'express-unpick' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(findQuery, { _id: deliveryId, coupleId });
  assert.equal(updateQuery._id, deliveryId);
  assert.equal(updateQuery.coupleId, coupleId);
  assert.equal(updateQuery.pickerId, userId);
  assert.equal(updateQuery.status, 'picked');
  assert.equal(updateQuery.archivedAt, null);
  assert.ok(updateQuery.pickedAt.$gte instanceof Date);
  assert.deepEqual(callOrder, ['update', 'broadcast', 'push']);
  assert.equal(events[0].message.data.action, 'unpick');
  assert.equal(events[0].message.data.requestId, 'express-unpick');
  assert.equal(notifications[0][0], partnerId);
});

test('express unpick rejects a picked delivery from a previous Shanghai day', async () => {
  ExpressDelivery.findOne = async () => ({
    _id: deliveryId,
    requesterId: partnerId,
    pickerId: userId,
    coupleId,
    status: 'picked',
    pickedAt: new Date('2026-07-29T08:00:00.000Z')
  });
  let updateCalls = 0;
  ExpressDelivery.findOneAndUpdate = async () => {
    updateCalls += 1;
    return null;
  };

  const response = await fetch(`${baseUrl}/api/express/${deliveryId}/unpick`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'old-unpick' })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, '只能撤销今天完成的取件');
  assert.equal(updateCalls, 0);
  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test('express archive is requester-scoped, requires picked state and broadcasts after update', async () => {
  ExpressDelivery.findOne = async (query) => {
    assert.deepEqual(query, { _id: deliveryId, coupleId });
    return { _id: deliveryId, requesterId: userId, coupleId, status: 'picked' };
  };
  ExpressDelivery.findOneAndUpdate = async (query, update, options) => {
    callOrder.push('update');
    assert.deepEqual(query, { _id: deliveryId, coupleId, requesterId: userId, status: 'picked', archivedAt: null });
    assert.equal(update.$set.archivedBy, userId);
    assert.ok(update.$set.archivedAt instanceof Date);
    assert.deepEqual(options, { new: true });
    return { _id: deliveryId, archivedAt: update.$set.archivedAt, archivedBy: userId };
  };

  const response = await fetch(`${baseUrl}/api/express/${deliveryId}/archive`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ requesterId: partnerId, requestId: 'express-archive' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['update', 'broadcast']);
  assert.equal(events[0].message.data.action, 'archive');
  assert.equal(events[0].message.data.payload.archivedBy, userId);
});

test('express archive rejects a partner delivery without updating', async () => {
  ExpressDelivery.findOne = async () => ({ _id: deliveryId, requesterId: partnerId, coupleId, status: 'picked' });
  let updateCalls = 0;
  ExpressDelivery.findOneAndUpdate = async () => {
    updateCalls += 1;
  };

  const response = await fetch(`${baseUrl}/api/express/${deliveryId}/archive`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'partner-archive' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(updateCalls, 0);
  assert.equal(events.length, 0);
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
