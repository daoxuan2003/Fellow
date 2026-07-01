const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, Habit, CheckIn, Achievement } = require('../models');
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
let originalHabitFind;
let originalCheckInFind;
let originalCheckInFindOne;
let originalCheckInFindOneAndUpdate;
let originalAchievementFind;
let originalAchievementFindOne;
let originalAchievementSave;

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
  originalHabitFind = Habit.find;
  originalCheckInFind = CheckIn.find;
  originalCheckInFindOne = CheckIn.findOne;
  originalCheckInFindOneAndUpdate = CheckIn.findOneAndUpdate;
  originalAchievementFind = Achievement.find;
  originalAchievementFindOne = Achievement.findOne;
  originalAchievementSave = Achievement.prototype.save;
});

test.after(async () => {
  User.findById = originalUserFindById;
  Habit.findOne = originalHabitFindOne;
  Habit.findOneAndUpdate = originalHabitFindOneAndUpdate;
  Habit.findOneAndDelete = originalHabitFindOneAndDelete;
  Habit.prototype.save = originalHabitSave;
  CheckIn.deleteMany = originalCheckInDeleteMany;
  Habit.find = originalHabitFind;
  CheckIn.find = originalCheckInFind;
  CheckIn.findOne = originalCheckInFindOne;
  CheckIn.findOneAndUpdate = originalCheckInFindOneAndUpdate;
  Achievement.find = originalAchievementFind;
  Achievement.findOne = originalAchievementFindOne;
  Achievement.prototype.save = originalAchievementSave;
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
  Habit.find = originalHabitFind;
  CheckIn.find = originalCheckInFind;
  CheckIn.findOne = originalCheckInFindOne;
  CheckIn.findOneAndUpdate = originalCheckInFindOneAndUpdate;
  Achievement.find = originalAchievementFind;
  Achievement.findOne = originalAchievementFindOne;
  Achievement.prototype.save = originalAchievementSave;
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

test('habit create normalizes structured subtasks for workout plans', async () => {
  let savedHabit;

  Habit.prototype.save = async function save() {
    savedHabit = this;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/habits`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      title: '下肢训练',
      type: 'subtasks',
      frequency: 'weekly',
      weekdays: [1, 3, 99, 3],
      subTasks: [
        { id: 'warmup', title: '动态热身', groupTitle: '热身', targetValue: 8, unit: '分钟', weekday: 1 },
        { id: 'squat', title: '深蹲', groupTitle: '力量', targetValue: 4, unit: '组', weekday: 1 },
        { id: 'bad', title: '  ', groupTitle: '伪造', targetValue: 999, unit: '组' }
      ],
      leaves: [{ id: 'fake-leave', userId: partnerId, startDate: '2026-07-01', endDate: '2026-07-02' }]
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(savedHabit.type, 'subtasks');
  assert.deepEqual(Array.from(savedHabit.weekdays), [1, 3]);
  assert.equal(savedHabit.subTasks.length, 2);
  assert.equal(savedHabit.subTasks[0].groupTitle, '热身');
  assert.equal(savedHabit.subTasks[0].targetValue, 8);
  assert.equal(savedHabit.subTasks[0].unit, '分钟');
  assert.equal(Array.from(savedHabit.leaves || []).length, 0);
  assert.equal(events[0].message.data.payload.subTasks[1].groupTitle, '力量');
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

test('habit update allows creator to change type, frequency and structured subtasks', async () => {
  let updatePayload;

  Habit.findOne = async (query) => {
    assert.deepEqual(query, { _id: habitId, coupleId });
    return {
      _id: habitId,
      coupleId,
      createdBy: userId,
      title: '旧计划',
      type: 'simple',
      frequency: 'daily',
      weekdays: [],
      subTasks: [],
      numericConfig: {}
    };
  };
  Habit.findOneAndUpdate = async (query, update, options) => {
    updatePayload = update;
    assert.deepEqual(query, { _id: habitId, coupleId, createdBy: userId });
    assert.deepEqual(options, { new: true, runValidators: true });
    return {
      _id: habitId,
      coupleId,
      createdBy: userId,
      title: update.$set.title,
      description: '',
      icon: '☀️',
      color: '#EC4899',
      type: update.$set.type,
      participation: update.$set.participation,
      targetDays: 30,
      frequency: update.$set.frequency,
      weekdays: update.$set.weekdays,
      subTasks: update.$set.subTasks,
      numericConfig: update.$set.numericConfig,
      status: 'active',
      startDate: '2026-06-30',
      updatedAt: update.$set.updatedAt
    };
  };

  const response = await fetch(`${baseUrl}/api/habits/${habitId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      title: '健身计划',
      type: 'subtasks',
      participation: 'both',
      frequency: 'weekly',
      weekdays: [1, 5],
      subTasks: [
        { id: 'pushup', title: '俯卧撑', groupTitle: '力量', targetValue: 4, unit: '组', weekday: 1 }
      ],
      requestId: 'habit-structured-update'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(updatePayload.$set.type, 'subtasks');
  assert.deepEqual(updatePayload.$set.weekdays, [1, 5]);
  assert.equal(updatePayload.$set.subTasks[0].groupTitle, '力量');
  assert.equal(updatePayload.$set.subTasks[0].targetValue, 4);
  assert.equal(events[0].message.data.payload.frequency, 'weekly');
  assert.equal(events[0].message.data.requestId, 'habit-structured-update');
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

test('habit complete rejects partner-created plan without updating or broadcasting', async () => {
  let updateCalls = 0;

  Habit.findOne = async (query) => {
    assert.deepEqual(query, { _id: habitId, coupleId });
    return {
      _id: habitId,
      coupleId,
      createdBy: partnerId,
      participation: 'both',
      status: 'active',
      title: '伴侣计划'
    };
  };
  Habit.findOneAndUpdate = async () => {
    updateCalls += 1;
    return null;
  };

  const response = await fetch(`${baseUrl}/api/habits/${habitId}/complete`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'habit-complete' })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.message, '只有创建者可以完成计划');
  assert.equal(updateCalls, 0);
  assert.equal(events.length, 0);
});

test('habit complete scopes archive update to creator before broadcasting', async () => {
  let updateQuery;
  let updatePayload;
  let achievementSaveCalls = 0;
  const completedHabit = {
    _id: habitId,
    coupleId,
    createdBy: userId,
    participation: 'both',
    status: 'completed',
    title: '早睡',
    type: 'simple',
    completedAt: null,
    completedBy: null,
    leaves: [],
    weekdays: []
  };

  Habit.findOne = async (query) => {
    assert.deepEqual(query, { _id: habitId, coupleId });
    return {
      ...completedHabit,
      status: 'active'
    };
  };
  Habit.findOneAndUpdate = async (query, update, options) => {
    callOrder.push('update');
    updateQuery = query;
    updatePayload = update;
    assert.deepEqual(options, { new: true, runValidators: true });
    return {
      ...completedHabit,
      status: update.$set.status,
      completedAt: update.$set.completedAt,
      completedBy: update.$set.completedBy,
      updatedAt: update.$set.updatedAt
    };
  };
  Habit.find = async () => [{
    ...completedHabit,
    completedAt: updatePayload.$set.completedAt,
    completedBy: updatePayload.$set.completedBy
  }];
  CheckIn.find = async () => [];
  Achievement.find = async () => [];
  Achievement.findOne = async () => null;
  Achievement.prototype.save = async function save() {
    achievementSaveCalls += 1;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/habits/${habitId}/complete`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ requestId: 'habit-complete' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(updateQuery, {
    _id: habitId,
    coupleId,
    createdBy: userId,
    status: { $ne: 'completed' }
  });
  assert.equal(updatePayload.$set.status, 'completed');
  assert.equal(updatePayload.$set.completedBy, userId);
  assert.ok(updatePayload.$set.completedAt instanceof Date);
  assert.equal(updatePayload.$set.updatedAt, updatePayload.$set.completedAt);
  assert.deepEqual(callOrder, ['update', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.type, 'habitSync');
  assert.equal(events[0].message.data.action, 'archive');
  assert.equal(events[0].message.data.requestId, 'habit-complete');
  assert.ok(achievementSaveCalls > 0);
});

test('habit checkin filters forged subtasks and stores completion summary', async () => {
  const mondayHabit = {
    _id: habitId,
    coupleId,
    createdBy: userId,
    participation: 'both',
    status: 'active',
    title: '健身计划',
    type: 'subtasks',
    frequency: 'weekly',
    weekdays: [1],
    leaves: [],
    subTasks: [
      { id: 'warmup', title: '动态热身', groupTitle: '热身', targetValue: 8, unit: '分钟', weekday: 1, order: 0 },
      { id: 'squat', title: '深蹲', groupTitle: '力量', targetValue: 4, unit: '组', weekday: 1, order: 1 }
    ]
  };
  let updatePayload;

  Habit.findOne = async (query) => {
    assert.deepEqual(query, { _id: habitId, coupleId });
    return mondayHabit;
  };
  CheckIn.findOne = (query) => {
    if (query.userId === partnerId) return Promise.resolve(null);
    return {
      lean: async () => null
    };
  };
  CheckIn.findOneAndUpdate = async (query, update, options) => {
    updatePayload = update;
    assert.deepEqual(query, { habitId, userId, date: '2026-07-06' });
    assert.equal(options.upsert, true);
    return {
      _id: 'checkin-1',
      habitId,
      userId,
      coupleId,
      date: '2026-07-06',
      mood: update.$set.mood,
      note: update.$set.note,
      completedSubTasks: update.$set.completedSubTasks,
      completionSummary: update.$set.completionSummary,
      isPerfect: update.$set.isPerfect
    };
  };
  Habit.find = async () => [];
  CheckIn.find = async () => [];
  Achievement.find = async () => [];
  Achievement.findOne = async () => null;
  Achievement.prototype.save = async function save() {
    return this;
  };

  const response = await fetch(`${baseUrl}/api/habits/${habitId}/checkin`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      date: '2026-07-06',
      completedSubTasks: ['warmup', 'forged-task'],
      note: '完成热身'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(updatePayload.$set.completedSubTasks, ['warmup']);
  assert.deepEqual(updatePayload.$set.completionSummary, {
    totalSubTasks: 2,
    completedSubTasks: 1,
    completionRate: 50,
    totalGroups: 2,
    completedGroups: 1,
    status: 'started'
  });
  assert.equal(updatePayload.$set.isPerfect, false);
  assert.equal(events[0].message.data.payload.completionSummary.completionRate, 50);
});
