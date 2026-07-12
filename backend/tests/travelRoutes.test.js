const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, Travel } = require('../models');
const storageService = require('../services/storage');
const travelRoutes = require('../routes/travel');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const travelId = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');
const validPhotoPath = `couples/${coupleId}/photos/travel-memory.png`;
const foreignPhotoPath = 'couples/aaaaaaaaaaaaaaaaaaaaaaaa_bbbbbbbbbbbbbbbbbbbbbbbb/photos/travel-memory.png';

let server;
let baseUrl;
let events;
let callOrder;
let originalUserFindById;
let originalTravelFind;
let originalTravelFindOne;
let originalTravelFindOneAndUpdate;
let originalTravelDeleteOne;
let originalTravelPrototypeSave;
let originalStorageGetUrl;

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
  originalTravelFind = Travel.find;
  originalTravelFindOne = Travel.findOne;
  originalTravelFindOneAndUpdate = Travel.findOneAndUpdate;
  originalTravelDeleteOne = Travel.deleteOne;
  originalTravelPrototypeSave = Travel.prototype.save;
  originalStorageGetUrl = storageService.getUrl;
});

test.after(async () => {
  User.findById = originalUserFindById;
  Travel.find = originalTravelFind;
  Travel.findOne = originalTravelFindOne;
  Travel.findOneAndUpdate = originalTravelFindOneAndUpdate;
  Travel.deleteOne = originalTravelDeleteOne;
  Travel.prototype.save = originalTravelPrototypeSave;
  storageService.getUrl = originalStorageGetUrl;
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
  Travel.find = originalTravelFind;
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
  Travel.prototype.save = originalTravelPrototypeSave;
  storageService.getUrl = originalStorageGetUrl;
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

test('travel list returns fresh URLs for stored private photo paths', async () => {
  Travel.find = (query) => {
    assert.deepEqual(query, { coupleId });
    return {
      sort(sortQuery) {
        assert.deepEqual(sortQuery, { date: -1 });
        return Promise.resolve([
          {
            _id: travelId,
            coupleId,
            createdBy: userId,
            city: '杭州',
            photos: [validPhotoPath, 'https://legacy.example/travel.jpg']
          }
        ]);
      }
    };
  };
  storageService.getUrl = async (filePath, expiresIn, baseUrlArg) => {
    callOrder.push('getUrl');
    assert.equal(filePath, validPhotoPath);
    assert.equal(expiresIn, 3600);
    assert.match(baseUrlArg, /^http:\/\/127\.0\.0\.1:\d+$/);
    return `${baseUrlArg}/uploads/${filePath}?fresh=1`;
  };

  const response = await fetch(`${baseUrl}/api/travels`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['getUrl']);
  assert.deepEqual(body.data[0].photos, [
    `${baseUrl}/uploads/${validPhotoPath}?fresh=1`,
    'https://legacy.example/travel.jpg'
  ]);
});

test('travel create rejects client supplied photo URLs', async () => {
  Travel.prototype.save = async function saveTravel() {
    callOrder.push('save');
    return this;
  };

  const response = await fetch(`${baseUrl}/api/travels`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      city: '杭州',
      date: '2026-07-12',
      photos: ['https://example.invalid/travel.jpg'],
      requestId: 'travel-create-url'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, '照片文件路径不正确');
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
});

test('travel create rejects photo paths outside the active relationship', async () => {
  Travel.prototype.save = async function saveTravel() {
    callOrder.push('save');
    return this;
  };

  const response = await fetch(`${baseUrl}/api/travels`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      city: '杭州',
      date: '2026-07-12',
      photos: [foreignPhotoPath],
      requestId: 'travel-create-foreign'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '无权使用该照片文件');
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
});

test('travel create stores verified photo paths and emits serialized URLs after save', async () => {
  let savedTravel;
  Travel.prototype.save = async function saveTravel() {
    callOrder.push('save');
    this._id = travelId;
    this.createdAt = new Date('2026-07-12T00:00:00.000Z');
    savedTravel = this;
    return this;
  };
  storageService.getUrl = async (filePath, expiresIn, baseUrlArg) => {
    callOrder.push('getUrl');
    assert.equal(filePath, validPhotoPath);
    assert.equal(expiresIn, 3600);
    assert.match(baseUrlArg, /^http:\/\/127\.0\.0\.1:\d+$/);
    return `${baseUrlArg}/uploads/${filePath}?fresh=1`;
  };

  const response = await fetch(`${baseUrl}/api/travels`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      city: '杭州',
      date: '2026-07-12',
      photos: [validPhotoPath],
      createdBy: partnerId,
      requestId: 'travel-create'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['save', 'getUrl', 'broadcast']);
  assert.equal(savedTravel.createdBy, userId);
  assert.deepEqual(savedTravel.photos, [validPhotoPath]);
  assert.deepEqual(body.data.photos, [`${baseUrl}/uploads/${validPhotoPath}?fresh=1`]);
  assert.equal(body.data.createdBy, userId);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.type, 'travelSync');
  assert.equal(events[0].message.data.action, 'create');
  assert.deepEqual(events[0].message.data.payload.photos, [`${baseUrl}/uploads/${validPhotoPath}?fresh=1`]);
  assert.equal(events[0].message.data.payload.createdBy, userId);
  assert.equal(events[0].message.data.requestId, 'travel-create');
});

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
    assert.deepEqual(options, { new: true, runValidators: true });
    return {
      _id: travelId,
      createdBy: userId,
      city: '苏州',
      photos: []
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

test('travel update rejects invalid ids before reading records', async () => {
  let findCalls = 0;
  Travel.findOne = async () => {
    findCalls += 1;
    return null;
  };

  const response = await fetch(`${baseUrl}/api/travels/not-a-travel-id`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ city: '苏州', requestId: 'travel-update-invalid-id' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, '旅行记录不存在');
  assert.equal(findCalls, 0);
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
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

test('travel delete rejects invalid ids before reading records', async () => {
  let findCalls = 0;
  Travel.findOne = async () => {
    findCalls += 1;
    return null;
  };

  const response = await fetch(`${baseUrl}/api/travels/not-a-travel-id`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'travel-delete-invalid-id' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, '旅行记录不存在');
  assert.equal(findCalls, 0);
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
