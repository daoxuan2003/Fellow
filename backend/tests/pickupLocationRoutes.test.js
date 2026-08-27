const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { JWT_SECRET } = require('../config/auth');
const { User, PickupLocation, ExpressDelivery } = require('../models');
const pickupLocationRoutes = require('../routes/pickupLocation');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const locationId = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let callOrder;
let broadcasts;
let originalUserFindById;
let originalLocationFindOne;
let originalLocationFindOneAndUpdate;
let originalLocationDeleteOne;
let originalDeliveryUpdateMany;
let originalConnectionTransaction;
let originalReadyStateDescriptor;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (...args) => broadcasts.push(args);
  app.use('/api/pickup-locations', pickupLocationRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalLocationFindOne = PickupLocation.findOne;
  originalLocationFindOneAndUpdate = PickupLocation.findOneAndUpdate;
  originalLocationDeleteOne = PickupLocation.deleteOne;
  originalDeliveryUpdateMany = ExpressDelivery.updateMany;
  originalConnectionTransaction = mongoose.connection.transaction;
  originalReadyStateDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
});

test.after(async () => {
  User.findById = originalUserFindById;
  PickupLocation.findOne = originalLocationFindOne;
  PickupLocation.findOneAndUpdate = originalLocationFindOneAndUpdate;
  PickupLocation.deleteOne = originalLocationDeleteOne;
  ExpressDelivery.updateMany = originalDeliveryUpdateMany;
  mongoose.connection.transaction = originalConnectionTransaction;
  if (originalReadyStateDescriptor) {
    Object.defineProperty(mongoose.connection, 'readyState', originalReadyStateDescriptor);
  }
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test.beforeEach(() => {
  callOrder = [];
  broadcasts = [];
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
  ExpressDelivery.updateMany = async () => ({ modifiedCount: 0 });
  mongoose.connection.transaction = originalConnectionTransaction;
  if (originalReadyStateDescriptor) {
    Object.defineProperty(mongoose.connection, 'readyState', originalReadyStateDescriptor);
  }
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

function useUnsupportedTransactions() {
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, value: 1 });
  mongoose.connection.transaction = async () => {
    throw new Error('Transaction numbers are only allowed on a replica set member or mongos');
  };
}

function installRenameFallbackStore({ failReady = false } = {}) {
  const location = makeLocation({ renameStatus: 'ready' });
  const deliveries = [{ pickupLocation: '南门' }, { pickupLocation: '南门' }];
  let readyFailures = 0;

  PickupLocation.findOne = async query => {
    if (query.name) return null;
    if (String(query._id) !== locationId || query.coupleId !== coupleId) return null;
    if (query.createdBy && String(query.createdBy) !== String(location.createdBy)) return null;
    return location;
  };
  PickupLocation.findOneAndUpdate = async (query, update) => {
    if (String(query._id) !== locationId || query.coupleId !== coupleId) return null;
    if (query.createdBy && String(query.createdBy) !== String(location.createdBy)) return null;
    if (query.name && query.name !== location.name) return null;
    if (typeof query.renameStatus === 'string' && query.renameStatus !== location.renameStatus) return null;
    if (query.renameStatus?.$nin?.includes(location.renameStatus)) return null;
    if (query.renameRequestId
      && String(query.renameRequestId) !== String(location.renameRequestId || '')) return null;
    if (failReady && location.renameStatus === 'pending'
      && update.$set?.renameStatus === 'ready' && readyFailures++ === 0) {
      throw new Error('simulated pickup ready failure');
    }
    if (update.name) location.name = update.name;
    if (update.$set) Object.assign(location, update.$set);
    if (update.$unset) {
      for (const key of Object.keys(update.$unset)) delete location[key];
    }
    return location;
  };
  ExpressDelivery.updateMany = async (query, update) => {
    let modifiedCount = 0;
    for (const delivery of deliveries) {
      if (query.coupleId === coupleId && delivery.pickupLocation === query.pickupLocation) {
        delivery.pickupLocation = update.$set.pickupLocation;
        modifiedCount += 1;
      }
    }
    return { modifiedCount };
  };
  return { location, deliveries };
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
  ExpressDelivery.updateMany = async (query, update, options) => {
    callOrder.push('deliveries');
    assert.deepEqual(query, { coupleId, pickupLocation: '南门' });
    assert.deepEqual(update, { $set: { pickupLocation: '北门' } });
    assert.deepEqual(options, {});
    return { modifiedCount: 2 };
  };
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
  assert.deepEqual(callOrder, ['update', 'deliveries']);
  assert.equal(body.data.name, '北门');
  assert.equal(body.data.createdBy, userId);
  assert.deepEqual(broadcasts, [[coupleId, {
    type: 'pickupLocationSync',
    data: {
      action: 'update',
      payload: { id: locationId, name: '北门', createdBy: userId },
      actor: userId
    }
  }]]);
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
  assert.deepEqual(broadcasts, []);
});

test('unsupported transactions rename a location and linked deliveries without returning 500', async () => {
  useUnsupportedTransactions();
  const store = installRenameFallbackStore();

  const response = await fetch(`${baseUrl}/api/pickup-locations/${locationId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ name: '北门' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.name, '北门');
  assert.equal(store.location.name, '北门');
  assert.equal(store.location.renameStatus, 'ready');
  assert.equal(store.location.renamePreviousName, undefined);
  assert.deepEqual(store.deliveries.map(row => row.pickupLocation), ['北门', '北门']);
  assert.equal(broadcasts.length, 1);
});

test('a failed unsupported rename restores both the location and linked deliveries', async () => {
  useUnsupportedTransactions();
  const store = installRenameFallbackStore({ failReady: true });

  const response = await fetch(`${baseUrl}/api/pickup-locations/${locationId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ name: '北门' })
  });

  assert.equal(response.status, 500);
  assert.equal(store.location.name, '南门');
  assert.equal(store.location.renameStatus, 'ready');
  assert.equal(store.location.renameRequestId, undefined);
  assert.deepEqual(store.deliveries.map(row => row.pickupLocation), ['南门', '南门']);
  assert.equal(broadcasts.length, 0);
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
  assert.deepEqual(broadcasts, [[coupleId, {
    type: 'pickupLocationSync',
    data: {
      action: 'delete',
      payload: { id: locationId, name: '南门' },
      actor: userId
    }
  }]]);
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
  assert.deepEqual(broadcasts, []);
});
