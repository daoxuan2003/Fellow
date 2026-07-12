const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, Food } = require('../models');
const storageService = require('../services/storage');
const foodRoutes = require('../routes/food');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const foodId = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');
const validPhotoPath = `couples/${coupleId}/photos/food-memory.png`;
const foreignPhotoPath = 'couples/aaaaaaaaaaaaaaaaaaaaaaaa_bbbbbbbbbbbbbbbbbbbbbbbb/photos/food-memory.png';

let server;
let baseUrl;
let events;
let callOrder;
let originalUserFindById;
let originalFoodFind;
let originalFoodFindOne;
let originalFoodFindOneAndUpdate;
let originalFoodDeleteOne;
let originalFoodPrototypeSave;
let originalStorageGetUrl;

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
  originalFoodFind = Food.find;
  originalFoodFindOne = Food.findOne;
  originalFoodFindOneAndUpdate = Food.findOneAndUpdate;
  originalFoodDeleteOne = Food.deleteOne;
  originalFoodPrototypeSave = Food.prototype.save;
  originalStorageGetUrl = storageService.getUrl;
});

test.after(async () => {
  User.findById = originalUserFindById;
  Food.find = originalFoodFind;
  Food.findOne = originalFoodFindOne;
  Food.findOneAndUpdate = originalFoodFindOneAndUpdate;
  Food.deleteOne = originalFoodDeleteOne;
  Food.prototype.save = originalFoodPrototypeSave;
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
  Food.find = originalFoodFind;
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
  Food.prototype.save = originalFoodPrototypeSave;
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

test('food list returns fresh URLs for stored private photo paths', async () => {
  Food.find = (query) => {
    assert.deepEqual(query, { coupleId });
    return {
      sort(sortQuery) {
        assert.deepEqual(sortQuery, { date: -1 });
        return Promise.resolve([
          {
            _id: foodId,
            coupleId,
            createdBy: userId,
            restaurant: '街角小馆',
            photos: [validPhotoPath, 'https://legacy.example/food.jpg']
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

  const response = await fetch(`${baseUrl}/api/foods`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['getUrl']);
  assert.deepEqual(body.data[0].photos, [
    `${baseUrl}/uploads/${validPhotoPath}?fresh=1`,
    'https://legacy.example/food.jpg'
  ]);
});

test('food create rejects client supplied photo URLs', async () => {
  Food.prototype.save = async function saveFood() {
    callOrder.push('save');
    return this;
  };

  const response = await fetch(`${baseUrl}/api/foods`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      restaurant: '街角小馆',
      date: '2026-07-12',
      photos: ['https://example.invalid/food.jpg'],
      requestId: 'food-create-url'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, '照片文件路径不正确');
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
});

test('food create rejects photo paths outside the active relationship', async () => {
  Food.prototype.save = async function saveFood() {
    callOrder.push('save');
    return this;
  };

  const response = await fetch(`${baseUrl}/api/foods`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      restaurant: '街角小馆',
      date: '2026-07-12',
      photos: [foreignPhotoPath],
      requestId: 'food-create-foreign'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '无权使用该照片文件');
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
});

test('food create stores verified photo paths and emits serialized URLs after save', async () => {
  let savedFood;
  Food.prototype.save = async function saveFood() {
    callOrder.push('save');
    this._id = foodId;
    this.createdAt = new Date('2026-07-12T00:00:00.000Z');
    savedFood = this;
    return this;
  };
  storageService.getUrl = async (filePath, expiresIn, baseUrlArg) => {
    callOrder.push('getUrl');
    assert.equal(filePath, validPhotoPath);
    assert.equal(expiresIn, 3600);
    assert.match(baseUrlArg, /^http:\/\/127\.0\.0\.1:\d+$/);
    return `${baseUrlArg}/uploads/${filePath}?fresh=1`;
  };

  const response = await fetch(`${baseUrl}/api/foods`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      restaurant: '街角小馆',
      date: '2026-07-12',
      photos: [validPhotoPath],
      createdBy: partnerId,
      requestId: 'food-create'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['save', 'getUrl', 'broadcast']);
  assert.equal(savedFood.createdBy, userId);
  assert.deepEqual(savedFood.photos, [validPhotoPath]);
  assert.deepEqual(body.data.photos, [`${baseUrl}/uploads/${validPhotoPath}?fresh=1`]);
  assert.equal(body.data.createdBy, userId);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.type, 'foodSync');
  assert.equal(events[0].message.data.action, 'create');
  assert.deepEqual(events[0].message.data.payload.photos, [`${baseUrl}/uploads/${validPhotoPath}?fresh=1`]);
  assert.equal(events[0].message.data.payload.createdBy, userId);
  assert.equal(events[0].message.data.requestId, 'food-create');
});

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
    assert.deepEqual(options, { new: true, runValidators: true });
    return {
      _id: foodId,
      createdBy: userId,
      restaurant: '新名字',
      photos: []
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

test('food update rejects invalid ids before reading records', async () => {
  let findCalls = 0;
  Food.findOne = async () => {
    findCalls += 1;
    return null;
  };

  const response = await fetch(`${baseUrl}/api/foods/not-a-food-id`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ restaurant: '新名字', requestId: 'food-update-invalid-id' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, '美食记录不存在');
  assert.equal(findCalls, 0);
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
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

test('food delete rejects invalid ids before reading records', async () => {
  let findCalls = 0;
  Food.findOne = async () => {
    findCalls += 1;
    return null;
  };

  const response = await fetch(`${baseUrl}/api/foods/not-a-food-id`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'food-delete-invalid-id' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, '美食记录不存在');
  assert.equal(findCalls, 0);
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
