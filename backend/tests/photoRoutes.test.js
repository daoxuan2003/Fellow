const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, Photo } = require('../models');
const storageService = require('../services/storage');
const photoRoutes = require('../routes/photo');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const photoId = '333333333333333333333333';
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
let originalPhotoFindOne;
let originalPhotoFindOneAndUpdate;
let originalPhotoDeleteOne;
let originalStorageUpload;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    callOrder.push('broadcast');
    events.push({ coupleId: targetCoupleId, message });
  };
  app.use('/api', photoRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalPhotoFindOne = Photo.findOne;
  originalPhotoFindOneAndUpdate = Photo.findOneAndUpdate;
  originalPhotoDeleteOne = Photo.deleteOne;
  originalStorageUpload = storageService.upload;
});

test.after(async () => {
  User.findById = originalUserFindById;
  Photo.findOne = originalPhotoFindOne;
  Photo.findOneAndUpdate = originalPhotoFindOneAndUpdate;
  Photo.deleteOne = originalPhotoDeleteOne;
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
  Photo.findOne = async (query) => {
    assert.deepEqual(query, { _id: photoId, coupleId });
    return makePhoto({ uploadedBy: userId });
  };
  Photo.findOneAndUpdate = originalPhotoFindOneAndUpdate;
  Photo.deleteOne = originalPhotoDeleteOne;
  storageService.upload = originalStorageUpload;
});

function makePhoto(overrides = {}) {
  const photo = {
    _id: photoId,
    coupleId,
    uploadedBy: userId,
    caption: '旧描述',
    tags: ['旧标签'],
    type: 'normal',
    date: '2026-06-01',
    async save() {
      callOrder.push('save');
      return this;
    },
    ...overrides
  };
  return photo;
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

function uploadHeaders() {
  const token = jwt.sign({ userId, account: 'viewer' }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '5m'
  });
  return { Authorization: `Bearer ${token}` };
}

test('photo upload rejects unbound users before writing storage', async () => {
  let uploadCalls = 0;
  User.findById = async () => ({
    _id: userId,
    partnerId: null,
    nickname: '小赴'
  });
  storageService.upload = async () => {
    uploadCalls += 1;
  };
  const form = new FormData();
  form.append('file', new Blob([PNG_IMAGE], { type: 'image/png' }), 'photo.png');

  const response = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    headers: uploadHeaders(),
    body: form
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, '请先绑定伴侣');
  assert.equal(uploadCalls, 0);
});

test('photo update rejects partner-uploaded photo without saving or broadcasting', async () => {
  Photo.findOne = async (query) => {
    assert.deepEqual(query, { _id: photoId, coupleId });
    return makePhoto({ uploadedBy: partnerId });
  };

  const response = await fetch(`${baseUrl}/api/photos/${photoId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ caption: '新描述', requestId: 'photo-update-partner-owned' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '只能修改自己上传的照片');
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
});

test('photo update emits sync only after uploader-scoped database update succeeds', async () => {
  Photo.findOneAndUpdate = async (query, update, options) => {
    callOrder.push('update');
    assert.deepEqual(query, { _id: photoId, coupleId, uploadedBy: userId });
    assert.deepEqual(update, { $set: { caption: '新描述', tags: ['旅行'] } });
    assert.deepEqual(options, { new: true, runValidators: true });
    return makePhoto({
      caption: update.$set.caption,
      tags: update.$set.tags,
      uploadedBy: userId
    });
  };

  const response = await fetch(`${baseUrl}/api/photos/${photoId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      caption: '新描述',
      tags: ['旅行'],
      uploadedBy: partnerId,
      requestId: 'photo-update'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['update', 'broadcast']);
  assert.equal(body.data.caption, '新描述');
  assert.equal(body.data.uploadedBy, userId);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.type, 'photoSync');
  assert.equal(events[0].message.data.action, 'update');
  assert.equal(events[0].message.data.payload.caption, '新描述');
  assert.equal(events[0].message.data.payload.uploadedBy, undefined);
  assert.equal(events[0].message.data.requestId, 'photo-update');
});

test('photo update rejects invalid ids before reading photos', async () => {
  let findCalls = 0;
  Photo.findOne = async () => {
    findCalls += 1;
    return makePhoto();
  };

  const response = await fetch(`${baseUrl}/api/photos/not-a-photo-id`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ caption: '新描述', requestId: 'photo-update-invalid-id' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, '照片不存在');
  assert.equal(findCalls, 0);
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
});

test('photo update does not emit sync when database update fails', async () => {
  Photo.findOneAndUpdate = async () => {
    callOrder.push('update');
    throw new Error('update failed');
  };

  const response = await fetch(`${baseUrl}/api/photos/${photoId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ caption: '新描述', requestId: 'photo-update-failed' })
  });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['update']);
  assert.equal(events.length, 0);
});

test('photo update does not emit sync when uploader-scoped update finds nothing', async () => {
  Photo.findOneAndUpdate = async () => {
    callOrder.push('update');
    return null;
  };

  const response = await fetch(`${baseUrl}/api/photos/${photoId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ caption: '新描述', requestId: 'photo-update-stale' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, '照片不存在');
  assert.deepEqual(callOrder, ['update']);
  assert.equal(events.length, 0);
});

test('photo delete emits sync only after uploader-scoped database delete succeeds', async () => {
  Photo.deleteOne = async (query) => {
    callOrder.push('delete');
    assert.deepEqual(query, { _id: photoId, coupleId, uploadedBy: userId });
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/photos/${photoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'photo-delete' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['delete', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'photoSync');
  assert.equal(events[0].message.data.action, 'delete');
  assert.equal(events[0].message.data.requestId, 'photo-delete');
});

test('photo delete rejects partner-uploaded photo without deleting or broadcasting', async () => {
  Photo.findOne = async (query) => {
    assert.deepEqual(query, { _id: photoId, coupleId });
    return makePhoto({ uploadedBy: partnerId });
  };
  Photo.deleteOne = async () => {
    callOrder.push('delete');
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/photos/${photoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'photo-delete-partner-owned' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '只能删除自己上传的照片');
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
});

test('photo delete rejects invalid ids before reading photos', async () => {
  let findCalls = 0;
  Photo.findOne = async () => {
    findCalls += 1;
    return makePhoto();
  };

  const response = await fetch(`${baseUrl}/api/photos/not-a-photo-id`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'photo-delete-invalid-id' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, '照片不存在');
  assert.equal(findCalls, 0);
  assert.deepEqual(callOrder, []);
  assert.equal(events.length, 0);
});

test('photo delete does not emit sync when database delete fails', async () => {
  Photo.deleteOne = async () => {
    callOrder.push('delete');
    throw new Error('delete failed');
  };

  const response = await fetch(`${baseUrl}/api/photos/${photoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'photo-delete-failed' })
  });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
});

test('photo delete does not emit sync when nothing is deleted', async () => {
  Photo.deleteOne = async () => {
    callOrder.push('delete');
    return { deletedCount: 0 };
  };

  const response = await fetch(`${baseUrl}/api/photos/${photoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'photo-delete-stale' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
});
