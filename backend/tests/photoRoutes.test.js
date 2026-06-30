const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, Photo } = require('../models');
const photoRoutes = require('../routes/photo');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const photoId = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let events;
let callOrder;
let originalUserFindById;
let originalPhotoFindOne;
let originalPhotoDeleteOne;

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
  originalPhotoDeleteOne = Photo.deleteOne;
});

test.after(async () => {
  User.findById = originalUserFindById;
  Photo.findOne = originalPhotoFindOne;
  Photo.deleteOne = originalPhotoDeleteOne;
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
  Photo.deleteOne = originalPhotoDeleteOne;
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

test('photo update emits sync only after uploader-scoped save succeeds', async () => {
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
  assert.deepEqual(callOrder, ['save', 'broadcast']);
  assert.equal(body.data.caption, '新描述');
  assert.equal(body.data.uploadedBy, userId);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.type, 'photoSync');
  assert.equal(events[0].message.data.action, 'update');
  assert.equal(events[0].message.data.payload.caption, '新描述');
  assert.equal(events[0].message.data.payload.uploadedBy, undefined);
  assert.equal(events[0].message.data.requestId, 'photo-update');
});

test('photo update does not emit sync when save fails', async () => {
  Photo.findOne = async (query) => {
    assert.deepEqual(query, { _id: photoId, coupleId });
    return makePhoto({
      async save() {
        callOrder.push('save');
        throw new Error('save failed');
      }
    });
  };

  const response = await fetch(`${baseUrl}/api/photos/${photoId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ caption: '新描述', requestId: 'photo-update-failed' })
  });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['save']);
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
