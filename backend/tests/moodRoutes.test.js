const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, MoodRecord } = require('../models');
const moodRoutes = require('../routes/mood');
const { getTodayString } = require('../utils/helpers');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const recordId = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let events;
let callOrder;
let originalUserFindById;
let originalUserFind;
let originalMoodFind;
let originalMoodFindOne;
let originalMoodFindOneAndUpdate;
let originalMoodDeleteOne;
let originalMoodSave;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    callOrder.push('broadcast');
    events.push({ coupleId: targetCoupleId, message });
  };
  app.use('/api/mood', moodRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalUserFind = User.find;
  originalMoodFind = MoodRecord.find;
  originalMoodFindOne = MoodRecord.findOne;
  originalMoodFindOneAndUpdate = MoodRecord.findOneAndUpdate;
  originalMoodDeleteOne = MoodRecord.deleteOne;
  originalMoodSave = MoodRecord.prototype.save;
});

test.after(async () => {
  User.findById = originalUserFindById;
  User.find = originalUserFind;
  MoodRecord.find = originalMoodFind;
  MoodRecord.findOne = originalMoodFindOne;
  MoodRecord.findOneAndUpdate = originalMoodFindOneAndUpdate;
  MoodRecord.deleteOne = originalMoodDeleteOne;
  MoodRecord.prototype.save = originalMoodSave;
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
  User.find = originalUserFind;
  MoodRecord.find = originalMoodFind;
  MoodRecord.findOne = originalMoodFindOne;
  MoodRecord.findOneAndUpdate = originalMoodFindOneAndUpdate;
  MoodRecord.deleteOne = originalMoodDeleteOne;
  MoodRecord.prototype.save = originalMoodSave;
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

function currentShanghaiTime() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}

test('mood create derives the couple and make-up state from the authenticated user and stores selected local time', async () => {
  let savedRecord;
  MoodRecord.prototype.save = async function save() {
    savedRecord = this;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/mood`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      mood: 'tired',
      note: '下午有一点累',
      recordDate: getTodayString(),
      recordTime: currentShanghaiTime(),
      isMakeUp: true,
      coupleId: 'untrusted-couple',
      userId: partnerId
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(savedRecord.userId, userId);
  assert.equal(savedRecord.coupleId, coupleId);
  assert.equal(savedRecord.isMakeUp, false);
  assert.equal(savedRecord.recordDate, getTodayString());
  assert.ok(savedRecord.recordedAt instanceof Date);
  assert.ok(body.data.recordedAt);
  assert.equal(events.length, 1);
  assert.equal(new Date(events[0].message.data.payload.recordedAt).getTime(), savedRecord.recordedAt.getTime());
});

test('mood list exposes shared comments while preserving a legacy partner response', async () => {
  const commentId = '444444444444444444444444';
  const createdAt = new Date('2026-07-31T04:00:00.000Z');
  MoodRecord.find = () => ({
    sort() { return this; },
    async limit() {
      return [{
        _id: recordId,
        userId,
        mood: 'calm',
        note: '慢慢来',
        partnerResponse: {
          kind: 'stay',
          message: '我在',
          responderId: partnerId,
          respondedAt: createdAt
        },
        comments: [{
          _id: commentId,
          commenterId: userId,
          kind: null,
          message: '谢谢你',
          createdAt
        }],
        recordDate: '2026-07-31',
        recordedAt: createdAt,
        isMakeUp: false,
        createdAt
      }];
    }
  });
  User.find = async () => [
    { _id: userId, nickname: '小赴', avatar: '', gender: 'female' },
    { _id: partnerId, nickname: '小共', avatar: '', gender: 'male' }
  ];

  const response = await fetch(`${baseUrl}/api/mood?date=2026-07-31`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data[0].partnerResponse.message, '我在');
  assert.equal(body.data[0].comments.length, 1);
  assert.equal(body.data[0].comments[0].id, commentId);
  assert.equal(body.data[0].comments[0].commenterId, userId);
  assert.equal(body.data[0].comments[0].message, '谢谢你');
});

test('mood response only updates a partner record and broadcasts after the database write', async () => {
  MoodRecord.findOne = async (query) => {
    assert.deepEqual(query, { _id: recordId, coupleId });
    return { _id: recordId, userId: partnerId, coupleId };
  };
  MoodRecord.findOneAndUpdate = async (query, update, options) => {
    callOrder.push('update');
    assert.deepEqual(query, { _id: recordId, coupleId, userId: { $ne: userId } });
    assert.equal(update.$set.partnerResponse.kind, 'stay');
    assert.equal(update.$set.partnerResponse.message, '我陪你慢慢来');
    assert.equal(update.$set.partnerResponse.responderId, userId);
    assert.ok(update.$set.partnerResponse.respondedAt instanceof Date);
    assert.deepEqual(options, { new: true });
    return { _id: recordId };
  };

  const response = await fetch(`${baseUrl}/api/mood/${recordId}/response`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ kind: 'stay', message: ' 我陪你慢慢来 ', responderId: partnerId, requestId: 'mood-response' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.responderId, userId);
  assert.deepEqual(callOrder, ['update', 'broadcast']);
  assert.equal(events[0].message.data.action, 'response');
  assert.equal(events[0].message.data.requestId, 'mood-response');
});

test('mood response rejects responding to the authenticated user own record', async () => {
  MoodRecord.findOne = async () => ({ _id: recordId, userId, coupleId });
  let updateCalls = 0;
  MoodRecord.findOneAndUpdate = async () => {
    updateCalls += 1;
  };

  const response = await fetch(`${baseUrl}/api/mood/${recordId}/response`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ kind: 'hug', message: '' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(updateCalls, 0);
  assert.equal(events.length, 0);
});

test('mood comment atomically appends to any record in the current relationship and derives its author from JWT', async () => {
  MoodRecord.findOneAndUpdate = async (query, update, options) => {
    callOrder.push('update');
    assert.deepEqual(query, { _id: recordId, coupleId });
    assert.equal(update.$push.comments.commenterId, userId);
    assert.equal(update.$push.comments.kind, 'listen');
    assert.equal(update.$push.comments.message, '你慢慢说，我在听');
    assert.ok(update.$push.comments._id instanceof require('mongoose').Types.ObjectId);
    assert.ok(update.$push.comments.createdAt instanceof Date);
    assert.equal(update.$set.updatedAt, update.$push.comments.createdAt);
    assert.deepEqual(options, { new: true });
    return { _id: recordId, userId, coupleId };
  };

  const response = await fetch(`${baseUrl}/api/mood/${recordId}/comments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      kind: 'listen',
      message: ' 你慢慢说，我在听 ',
      commenterId: partnerId,
      userId: partnerId,
      coupleId: 'untrusted-couple',
      requestId: 'mood-comment'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.commenterId, userId);
  assert.equal(body.data.message, '你慢慢说，我在听');
  assert.deepEqual(callOrder, ['update', 'broadcast']);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.data.action, 'comment');
  assert.equal(events[0].message.data.requestId, 'mood-comment');
});

test('mood comment accepts a message without a reaction and rejects an empty comment', async () => {
  let updateCalls = 0;
  MoodRecord.findOneAndUpdate = async (query, update) => {
    updateCalls += 1;
    assert.deepEqual(query, { _id: recordId, coupleId });
    assert.equal(update.$push.comments.kind, null);
    assert.equal(update.$push.comments.message, '今天也辛苦啦');
    return { _id: recordId, userId: partnerId, coupleId };
  };

  const acceptedResponse = await fetch(`${baseUrl}/api/mood/${recordId}/comments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message: ' 今天也辛苦啦 ' })
  });
  assert.equal(acceptedResponse.status, 200);

  const rejectedResponse = await fetch(`${baseUrl}/api/mood/${recordId}/comments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ kind: '', message: '   ' })
  });
  const body = await rejectedResponse.json();

  assert.equal(rejectedResponse.status, 400);
  assert.equal(body.success, false);
  assert.equal(updateCalls, 1);
  assert.equal(events.length, 1);
});

test('mood comment cannot append to a record outside the authenticated relationship', async () => {
  MoodRecord.findOneAndUpdate = async (query) => {
    callOrder.push('update');
    assert.deepEqual(query, { _id: recordId, coupleId });
    return null;
  };

  const response = await fetch(`${baseUrl}/api/mood/${recordId}/comments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ kind: 'hug', message: '' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['update']);
  assert.equal(events.length, 0);
});

test('mood delete only queries records in the authenticated current relationship', async () => {
  let deleteCalls = 0;

  MoodRecord.findOne = async (query) => {
    assert.deepEqual(query, { _id: recordId, userId, coupleId });
    return null;
  };
  MoodRecord.deleteOne = async () => {
    deleteCalls += 1;
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/mood/${recordId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(deleteCalls, 0);
  assert.equal(events.length, 0);
});

test('mood delete does not emit sync when database delete fails', async () => {
  MoodRecord.findOne = async (query) => {
    assert.deepEqual(query, { _id: recordId, userId, coupleId });
    return {
      _id: recordId,
      userId,
      coupleId,
      mood: 'happy'
    };
  };
  MoodRecord.deleteOne = async () => {
    callOrder.push('delete');
    throw new Error('delete failed');
  };

  const response = await fetch(`${baseUrl}/api/mood/${recordId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'mood-delete-failed' })
  });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.success, false);
  assert.deepEqual(callOrder, ['delete']);
  assert.equal(events.length, 0);
});

test('mood delete emits sync only after database delete succeeds', async () => {
  MoodRecord.findOne = async (query) => {
    assert.deepEqual(query, { _id: recordId, userId, coupleId });
    return {
      _id: recordId,
      userId,
      coupleId,
      mood: 'happy'
    };
  };
  MoodRecord.deleteOne = async (query) => {
    callOrder.push('delete');
    assert.deepEqual(query, { _id: recordId, userId, coupleId });
    return { deletedCount: 1 };
  };

  const response = await fetch(`${baseUrl}/api/mood/${recordId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'mood-delete' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['delete', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'moodSync');
  assert.equal(events[0].message.data.action, 'delete');
  assert.equal(events[0].message.data.requestId, 'mood-delete');
});
