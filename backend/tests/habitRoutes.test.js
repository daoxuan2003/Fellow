const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, Habit, CheckIn } = require('../models');
const habitRoutes = require('../routes/habit');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const coupleId = [userId, partnerId].sort().join('_');
const habitId = '333333333333333333333333';

let server;
let baseUrl;
let events;
let callOrder;
let originalUserFindById;
let originalHabitFindOne;
let originalHabitFindOneAndUpdate;
let originalHabitFindOneAndDelete;
let originalHabitSave;
let originalCheckInDeleteMany;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    callOrder.push('broadcast');
    events.push({ coupleId: targetCoupleId, message });
  };
  app.use('/api/habits', habitRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalHabitFindOne = Habit.findOne;
  originalHabitFindOneAndUpdate = Habit.findOneAndUpdate;
  originalHabitFindOneAndDelete = Habit.findOneAndDelete;
  originalHabitSave = Habit.prototype.save;
  originalCheckInDeleteMany = CheckIn.deleteMany;
});

test.after(async () => {
  User.findById = originalUserFindById;
  Habit.findOne = originalHabitFindOne;
  Habit.findOneAndUpdate = originalHabitFindOneAndUpdate;
  Habit.findOneAndDelete = originalHabitFindOneAndDelete;
  Habit.prototype.save = originalHabitSave;
  CheckIn.deleteMany = originalCheckInDeleteMany;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test.beforeEach(() => {
  events = [];
  callOrder = [];
  User.findById = async (id) => ({
    _id: id,
    partnerId,
    nickname: id === partnerId ? '伴侣' : '小赴',
    gender: 'female'
  });
  Habit.findOne = originalHabitFindOne;
  Habit.findOneAndUpdate = originalHabitFindOneAndUpdate;
  Habit.findOneAndDelete = originalHabitFindOneAndDelete;
  Habit.prototype.save = originalHabitSave;
  CheckIn.deleteMany = originalCheckInDeleteMany;
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

test('habit create ignores client-supplied leave records', async () => {
  let savedHabit;

  Habit.prototype.save = async function save() {
    savedHabit = this;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/habits`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      title: '早睡',
      leaves: [{
        id: 'fake-leave',
        userId: partnerId,
        startDate: '2026-07-01',
        endDate: '2026-07-02',
        reason: '伪造伴侣请假'
      }],
      requestId: 'habit-create'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(Array.from(savedHabit.leaves || []).length, 0);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'habitSync');
  assert.equal(events[0].message.data.action, 'create');
  assert.equal(events[0].message.data.requestId, 'habit-create');
});

test('habit update rejects partner-created plan without updating or broadcasting', async () => {
  let updateCalls = 0;

  Habit.findOne = async (query) => {
    assert.deepEqual(query, { _id: habitId, coupleId });
    return {
      _id: habitId,
      coupleId,
      createdBy: partnerId,
      title: '伴侣计划'
    };
  };
  Habit.findOneAndUpdate = async () => {
    updateCalls += 1;
    return null;
  };

  const response = await fetch(`${baseUrl}/api/habits/${habitId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      title: '改名',
      leaves: [{
        id: 'fake-leave',
        userId: partnerId,
        startDate: '2026-07-01',
        endDate: '2026-07-02'
      }]
    })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '只有创建者可以修改计划');
  assert.equal(updateCalls, 0);
  assert.equal(events.length, 0);
});

test('habit update strips leaves and scopes database update to creator', async () => {
  let updateQuery;
  let updatePayload;

  Habit.findOne = async (query) => {
    assert.deepEqual(query, { _id: habitId, coupleId });
    return {
      _id: habitId,
      coupleId,
      createdBy: userId,
      title: '早睡'
    };
  };
  Habit.findOneAndUpdate = async (query, update, options) => {
    callOrder.push('update');
    updateQuery = query;
    updatePayload = update;
    assert.deepEqual(options, { new: true, runValidators: true });
    return {
      _id: habitId,
      coupleId,
      createdBy: userId,
      title: update.$set.title,
      description: '',
      icon: '☀️',
      color: '#EC4899',
      targetDays: 30,
      subTasks: [],
      numericConfig: {},
      status: 'active',
      startDate: '2026-06-30',
      updatedAt: update.$set.updatedAt
    };
  };

  const response = await fetch(`${baseUrl}/api/habits/${habitId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      title: '早睡早起',
      leaves: [{
        id: 'fake-leave',
        userId: partnerId,
        startDate: '2026-07-01',
        endDate: '2026-07-02'
      }],
      requestId: 'habit-update'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(updateQuery, { _id: habitId, coupleId, createdBy: userId });
  assert.equal(updatePayload.$set.title, '早睡早起');
  assert.equal(updatePayload.$set.leaves, undefined);
  assert.ok(updatePayload.$set.updatedAt instanceof Date);
  assert.deepEqual(callOrder, ['update', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.type, 'habitSync');
  assert.equal(events[0].message.data.action, 'update');
  assert.equal(events[0].message.data.requestId, 'habit-update');
  assert.equal(events[0].message.data.payload.leaves, undefined);
});

test('habit delete rejects partner-created plan without deleting check-ins or broadcasting', async () => {
  let deleteCalls = 0;
  let checkInDeleteCalls = 0;

  Habit.findOne = async (query) => {
    assert.deepEqual(query, { _id: habitId, coupleId });
    return {
      _id: habitId,
      coupleId,
      createdBy: partnerId,
      title: '伴侣计划'
    };
  };
  Habit.findOneAndDelete = async () => {
    deleteCalls += 1;
    return null;
  };
  CheckIn.deleteMany = async () => {
    checkInDeleteCalls += 1;
    return { deletedCount: 0 };
  };

  const response = await fetch(`${baseUrl}/api/habits/${habitId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'habit-delete' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '只有创建者可以删除计划');
  assert.equal(deleteCalls, 0);
  assert.equal(checkInDeleteCalls, 0);
  assert.equal(events.length, 0);
});

test('habit delete removes creator-owned plan before clearing check-ins and broadcasting', async () => {
  Habit.findOne = async (query) => {
    assert.deepEqual(query, { _id: habitId, coupleId });
    return {
      _id: habitId,
      coupleId,
      createdBy: userId,
      title: '早睡'
    };
  };
  Habit.findOneAndDelete = async (query) => {
    callOrder.push('delete');
    assert.deepEqual(query, { _id: habitId, coupleId, createdBy: userId });
    return {
      _id: habitId,
      coupleId,
      createdBy: userId,
      title: '早睡'
    };
  };
  CheckIn.deleteMany = async (query) => {
    callOrder.push('delete-checkins');
    assert.deepEqual(query, { habitId });
    return { deletedCount: 3 };
  };

  const response = await fetch(`${baseUrl}/api/habits/${habitId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'habit-delete' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(callOrder, ['delete', 'delete-checkins', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.type, 'habitSync');
  assert.equal(events[0].message.data.action, 'delete');
  assert.equal(events[0].message.data.requestId, 'habit-delete');
});
