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
let originalMoodFindOne;
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
  originalMoodFindOne = MoodRecord.findOne;
  originalMoodDeleteOne = MoodRecord.deleteOne;
  originalMoodSave = MoodRecord.prototype.save;
});

test.after(async () => {
  User.findById = originalUserFindById;
  MoodRecord.findOne = originalMoodFindOne;
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
  MoodRecord.findOne = originalMoodFindOne;
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
