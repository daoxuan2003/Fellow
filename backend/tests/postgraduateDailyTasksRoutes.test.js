const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, PostgraduateDailyTask } = require('../models');
const postgraduateRoutes = require('../routes/postgraduate');
const { getTodayString } = require('../utils/helpers');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const coupleId = [userId, partnerId].sort().join('_');
const ownTaskId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const partnerTaskId = 'bbbbbbbbbbbbbbbbbbbbbbbb';

let server;
let baseUrl;
let events;
let originalUserFindById;
let originalTaskFind;
let originalTaskFindOne;
let originalTaskFindOneAndUpdate;
let originalTaskFindOneAndDelete;
let originalTaskBulkWrite;

function offsetDateOnly(dateString, amount) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
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

function task(overrides = {}) {
  return {
    _id: partnerTaskId,
    coupleId,
    date: getTodayString(),
    creatorId: partnerId,
    text: '完成高数第八讲复盘',
    batchId: 'request_12345678',
    position: 0,
    completedBy: null,
    completedAt: null,
    createdAt: new Date('2026-08-20T01:00:00Z'),
    updatedAt: new Date('2026-08-20T01:00:00Z'),
    ...overrides
  };
}

function stubFind(items, observe = () => {}) {
  PostgraduateDailyTask.find = (query) => {
    observe(query);
    return {
      sort(sort) {
        observe({ sort });
        return { lean: async () => items };
      }
    };
  };
}

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    events.push({ coupleId: targetCoupleId, message });
  };
  app.use('/api/postgraduate', postgraduateRoutes);

  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  originalUserFindById = User.findById;
  originalTaskFind = PostgraduateDailyTask.find;
  originalTaskFindOne = PostgraduateDailyTask.findOne;
  originalTaskFindOneAndUpdate = PostgraduateDailyTask.findOneAndUpdate;
  originalTaskFindOneAndDelete = PostgraduateDailyTask.findOneAndDelete;
  originalTaskBulkWrite = PostgraduateDailyTask.bulkWrite;
});

test.after(async () => {
  User.findById = originalUserFindById;
  PostgraduateDailyTask.find = originalTaskFind;
  PostgraduateDailyTask.findOne = originalTaskFindOne;
  PostgraduateDailyTask.findOneAndUpdate = originalTaskFindOneAndUpdate;
  PostgraduateDailyTask.findOneAndDelete = originalTaskFindOneAndDelete;
  PostgraduateDailyTask.bulkWrite = originalTaskBulkWrite;
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
});

test.beforeEach(() => {
  events = [];
  User.findById = async id => ({ _id: id, partnerId, nickname: '小赴' });
  PostgraduateDailyTask.find = originalTaskFind;
  PostgraduateDailyTask.findOne = originalTaskFindOne;
  PostgraduateDailyTask.findOneAndUpdate = originalTaskFindOneAndUpdate;
  PostgraduateDailyTask.findOneAndDelete = originalTaskFindOneAndDelete;
  PostgraduateDailyTask.bulkWrite = originalTaskBulkWrite;
});

test('daily task board returns exact local today and yesterday with viewer permissions', async () => {
  const today = getTodayString();
  const yesterday = offsetDateOnly(today, -1);
  let observedQuery;
  stubFind([
    task({ _id: ownTaskId, creatorId: userId, date: today, text: '背六个马原考点' }),
    task({ date: today, text: '复盘英语长难句' }),
    task({ _id: 'cccccccccccccccccccccccc', creatorId: userId, date: yesterday, completedBy: partnerId, completedAt: new Date() })
  ], value => {
    if (!value.sort) observedQuery = value;
  });

  const response = await fetch(`${baseUrl}/api/postgraduate/daily-tasks`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(observedQuery, { coupleId, date: { $in: [today, yesterday] } });
  assert.equal(body.data.today.date, today);
  assert.equal(body.data.today.readOnly, false);
  assert.equal(body.data.today.tasks[0].isMine, true);
  assert.equal(body.data.today.tasks[0].canDelete, true);
  assert.equal(body.data.today.tasks[0].canToggle, false);
  assert.equal(body.data.today.tasks[1].canToggle, true);
  assert.equal(body.data.yesterday.date, yesterday);
  assert.equal(body.data.yesterday.readOnly, true);
  assert.equal(body.data.yesterday.tasks[0].canDelete, false);
  assert.equal(body.data.yesterday.tasks[0].canToggle, false);
});

test('daily task creation writes several items idempotently with JWT-derived identity before broadcasting', async () => {
  let observedOperations;
  const persisted = [];
  PostgraduateDailyTask.bulkWrite = async operations => {
    observedOperations = operations;
    operations.forEach((operation, index) => {
      persisted.push(task({
        _id: index === 0 ? ownTaskId : 'dddddddddddddddddddddddd',
        ...operation.updateOne.update.$setOnInsert
      }));
    });
    return { upsertedCount: operations.length };
  };
  stubFind(persisted);

  const response = await fetch(`${baseUrl}/api/postgraduate/daily-tasks`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      items: ['看 3 个有机化学视频', '整理高数第八讲错题'],
      requestId: 'request_12345678',
      creatorId: partnerId,
      coupleId: 'attacker_pair',
      date: '1999-01-01'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.tasks.length, 2);
  assert.equal(observedOperations.length, 2);
  for (const operation of observedOperations) {
    assert.equal(operation.updateOne.filter.coupleId, coupleId);
    assert.equal(operation.updateOne.filter.creatorId, userId);
    assert.equal(operation.updateOne.filter.date, getTodayString());
    assert.equal(operation.updateOne.update.$setOnInsert.creatorId, userId);
  }
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.data.action, 'dailyTaskCreate');
});

test('daily task creation rejects invalid batches without a database write', async () => {
  let writes = 0;
  PostgraduateDailyTask.bulkWrite = async () => {
    writes += 1;
    return { upsertedCount: 0 };
  };

  const response = await fetch(`${baseUrl}/api/postgraduate/daily-tasks`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      items: ['太'.repeat(81)],
      requestId: 'request_12345678'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(writes, 0);
  assert.equal(events.length, 0);
});

test('repeated daily task request returns the original batch without duplicating or rebroadcasting', async () => {
  const existing = [task({ _id: ownTaskId, creatorId: userId, text: '整理高数错题' })];
  PostgraduateDailyTask.bulkWrite = async () => ({ upsertedCount: 0, matchedCount: 1 });
  stubFind(existing);

  const response = await fetch(`${baseUrl}/api/postgraduate/daily-tasks`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      items: ['整理高数错题'],
      requestId: 'request_12345678'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.changed, false);
  assert.equal(body.data.tasks.length, 1);
  assert.equal(events.length, 0);
});

test('only the partner atomically completes a current-day task before realtime broadcast', async () => {
  let observedWrite;
  PostgraduateDailyTask.findOneAndUpdate = async (query, update, options) => {
    observedWrite = { query, update, options };
    return task({ completedBy: userId, completedAt: update.$set.completedAt });
  };

  const response = await fetch(`${baseUrl}/api/postgraduate/daily-tasks/${partnerTaskId}/complete`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ completed: true, completedBy: partnerId })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.task.completed, true);
  assert.equal(body.data.task.completedByMe, true);
  assert.deepEqual(observedWrite.query.creatorId, { $ne: userId });
  assert.equal(observedWrite.query.coupleId, coupleId);
  assert.equal(observedWrite.query.date, getTodayString());
  assert.equal(observedWrite.query.completedAt, null);
  assert.equal(observedWrite.update.$set.completedBy, userId);
  assert.deepEqual(observedWrite.options, { new: true });
  assert.equal(events.length, 1);
  assert.equal(events[0].message.data.action, 'dailyTaskComplete');
});

test('a creator cannot complete their own task', async () => {
  PostgraduateDailyTask.findOneAndUpdate = async () => null;
  PostgraduateDailyTask.findOne = async () => task({ _id: ownTaskId, creatorId: userId });

  const response = await fetch(`${baseUrl}/api/postgraduate/daily-tasks/${ownTaskId}/complete`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ completed: true })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.match(body.message, /留给对方/);
  assert.equal(events.length, 0);
});

test('yesterday tasks reject completion changes and remain read only', async () => {
  PostgraduateDailyTask.findOneAndUpdate = async () => null;
  PostgraduateDailyTask.findOne = async () => task({ date: offsetDateOnly(getTodayString(), -1) });

  const response = await fetch(`${baseUrl}/api/postgraduate/daily-tasks/${partnerTaskId}/complete`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ completed: true })
  });
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.success, false);
  assert.match(body.message, /只读/);
  assert.equal(events.length, 0);
});

test('a creator can delete only their own pending task from today', async () => {
  let observedQuery;
  PostgraduateDailyTask.findOneAndDelete = async query => {
    observedQuery = query;
    return task({ _id: ownTaskId, creatorId: userId });
  };

  const response = await fetch(`${baseUrl}/api/postgraduate/daily-tasks/${ownTaskId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(observedQuery.coupleId, coupleId);
  assert.equal(observedQuery.creatorId, userId);
  assert.equal(observedQuery.date, getTodayString());
  assert.equal(observedQuery.completedAt, null);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.data.action, 'dailyTaskDelete');
});
