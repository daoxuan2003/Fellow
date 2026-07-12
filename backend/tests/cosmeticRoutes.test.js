const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, Cosmetic } = require('../models');
const storageService = require('../services/storage');
const cosmeticRoutes = require('../routes/cosmetics');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const cosmeticId = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');
const PNG_IMAGE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3MxZ5wAAAABJRU5ErkJggg==',
  'base64'
);

let server;
let baseUrl;
let events;
let callOrder;
let originalUserFindById;
let originalCosmeticFindOne;
let originalCosmeticFindOneAndUpdate;
let originalCosmeticDeleteOne;
let originalStorageUpload;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    callOrder.push('broadcast');
    events.push({ coupleId: targetCoupleId, message });
  };
  app.use('/api/cosmetics', cosmeticRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalCosmeticFindOne = Cosmetic.findOne;
  originalCosmeticFindOneAndUpdate = Cosmetic.findOneAndUpdate;
  originalCosmeticDeleteOne = Cosmetic.deleteOne;
  originalStorageUpload = storageService.upload;
});

test.after(async () => {
  User.findById = originalUserFindById;
  Cosmetic.findOne = originalCosmeticFindOne;
  Cosmetic.findOneAndUpdate = originalCosmeticFindOneAndUpdate;
  Cosmetic.deleteOne = originalCosmeticDeleteOne;
  storageService.upload = originalStorageUpload;
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
  Cosmetic.findOne = async () => ({
    _id: cosmeticId,
    ownerId: userId,
    coupleId,
    name: '精华',
    photoKey: ''
  });
  Cosmetic.findOneAndUpdate = originalCosmeticFindOneAndUpdate;
  Cosmetic.deleteOne = originalCosmeticDeleteOne;
  storageService.upload = originalStorageUpload;
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

function uploadHeaders() {
  const token = jwt.sign({ userId, account: 'viewer' }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '5m'
  });
  return { Authorization: `Bearer ${token}` };
}

test('cosmetic upload rejects missing users before writing storage', async () => {
  let uploadCalls = 0;
  User.findById = async () => null;
  storageService.upload = async () => {
    uploadCalls += 1;
  };
  const form = new FormData();
  form.append('photo', new Blob([PNG_IMAGE], { type: 'image/png' }), 'cosmetic.png');

  const response = await fetch(`${baseUrl}/api/cosmetics/upload`, {
    method: 'POST',
    headers: uploadHeaders(),
    body: form
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, '用户不存在');
  assert.equal(uploadCalls, 0);
});

test('cosmetic delete broadcasts only after database delete succeeds', async () => {
  let findQuery;
  Cosmetic.findOne = async (query) => {
    findQuery = query;
    return {
      _id: cosmeticId,
      ownerId: userId,
      coupleId,
      name: '精华',
      photoKey: ''
    };
  };
  Cosmetic.deleteOne = async (query) => {
    callOrder.push('delete');
    assert.deepEqual(query, { _id: cosmeticId, coupleId, ownerId: userId });
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/cosmetics/${cosmeticId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'cosmetic-delete' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(findQuery, { _id: cosmeticId, coupleId });
  assert.deepEqual(callOrder, ['delete', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'cosmeticSync');
  assert.equal(events[0].message.data.requestId, 'cosmetic-delete');
});

test('cosmetic delete does not read items outside the current relationship', async () => {
  let findQuery;
  let deleteCalls = 0;
  Cosmetic.findOne = async (query) => {
    findQuery = query;
    return null;
  };
  Cosmetic.deleteOne = async () => {
    deleteCalls += 1;
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/cosmetics/${cosmeticId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(findQuery, { _id: cosmeticId, coupleId });
  assert.equal(deleteCalls, 0);
  assert.equal(events.length, 0);
});

test('cosmetic status update rejects partner-owned item without updating or broadcasting', async () => {
  let findQuery;
  let updateCalls = 0;
  Cosmetic.findOne = async (query) => {
    findQuery = query;
    return {
      _id: cosmeticId,
      ownerId: partnerId,
      coupleId,
      name: '伴侣精华',
      photoKey: ''
    };
  };
  Cosmetic.findOneAndUpdate = async () => {
    updateCalls += 1;
    return null;
  };

  const response = await fetch(`${baseUrl}/api/cosmetics/${cosmeticId}/status`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status: 'empty', requestId: 'cosmetic-status' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '只有添加者才能更新状态');
  assert.deepEqual(findQuery, { _id: cosmeticId, coupleId });
  assert.equal(updateCalls, 0);
  assert.equal(events.length, 0);
});

test('cosmetic status update scopes database update to owner before broadcasting', async () => {
  let findQuery;
  let updateQuery;
  let updatePayload;

  Cosmetic.findOne = async (query) => {
    findQuery = query;
    return {
      _id: cosmeticId,
      ownerId: userId,
      coupleId,
      name: '精华',
      photoKey: '',
      status: 'active'
    };
  };
  Cosmetic.findOneAndUpdate = async (query, update, options) => {
    callOrder.push('update');
    updateQuery = query;
    updatePayload = update;
    assert.deepEqual(options, { new: true, runValidators: true });
    return {
      _id: cosmeticId,
      ownerId: userId,
      coupleId,
      name: '精华',
      photoKey: '',
      status: update.$set.status,
      emptiedAt: update.$set.emptiedAt,
      updatedAt: update.$set.updatedAt
    };
  };

  const response = await fetch(`${baseUrl}/api/cosmetics/${cosmeticId}/status`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status: 'empty', requestId: 'cosmetic-status' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(findQuery, { _id: cosmeticId, coupleId });
  assert.deepEqual(updateQuery, { _id: cosmeticId, coupleId, ownerId: userId });
  assert.equal(updatePayload.$set.status, 'empty');
  assert.ok(updatePayload.$set.emptiedAt instanceof Date);
  assert.equal(updatePayload.$set.updatedAt, updatePayload.$set.emptiedAt);
  assert.deepEqual(callOrder, ['update', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'cosmeticSync');
  assert.equal(events[0].message.data.action, 'statusChange');
  assert.equal(events[0].message.data.requestId, 'cosmetic-status');
});

test('cosmetic edit scopes lookup and database update to owner before broadcasting', async () => {
  let findQuery;
  let updateQuery;
  let updatePayload;
  Cosmetic.findOne = async (query) => {
    findQuery = query;
    return {
      _id: cosmeticId,
      ownerId: userId,
      coupleId,
      name: '精华',
      photoKey: '',
      openDate: '2026-07-01',
      expireDate: '2027-07-01',
      shelfLifeMonths: 12,
      remindDaysBefore: 30,
      note: '',
      reminderSent: true
    };
  };
  Cosmetic.findOneAndUpdate = async (query, update, options) => {
    callOrder.push('update');
    updateQuery = query;
    updatePayload = update;
    assert.deepEqual(options, { new: true, runValidators: true });
    return {
      _id: cosmeticId,
      ownerId: userId,
      coupleId,
      name: update.$set.name,
      openDate: update.$set.openDate,
      expireDate: update.$set.expireDate,
      shelfLifeMonths: update.$set.shelfLifeMonths,
      remindDaysBefore: update.$set.remindDaysBefore,
      note: update.$set.note,
      reminderSent: update.$set.reminderSent
    };
  };

  const response = await fetch(`${baseUrl}/api/cosmetics/${cosmeticId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      name: '  精华液  ',
      openDate: '2026-07-02',
      shelfLifeMonths: '6.5',
      remindDaysBefore: '15',
      note: ' 晚间使用 ',
      ownerId: partnerId,
      requestId: 'cosmetic-edit'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(findQuery, { _id: cosmeticId, coupleId });
  assert.deepEqual(updateQuery, { _id: cosmeticId, coupleId, ownerId: userId });
  assert.equal(updatePayload.$set.name, '精华液');
  assert.equal(updatePayload.$set.openDate, '2026-07-02');
  assert.equal(updatePayload.$set.shelfLifeMonths, 6.5);
  assert.equal(updatePayload.$set.expireDate, '2027-01-17');
  assert.equal(updatePayload.$set.remindDaysBefore, 15);
  assert.equal(updatePayload.$set.note, '晚间使用');
  assert.equal(updatePayload.$set.reminderSent, false);
  assert.ok(updatePayload.$set.updatedAt instanceof Date);
  assert.deepEqual(callOrder, ['update', 'broadcast']);
  assert.equal(events[0].message.data.action, 'update');
  assert.equal(events[0].message.data.requestId, 'cosmetic-edit');
});
