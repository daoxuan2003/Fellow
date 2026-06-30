const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const User = require('../models/User');
const Habit = require('../models/Habit');
const aiApplyRoutes = require('../routes/ai-apply');

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
let originalHabitSave;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    callOrder.push('broadcast');
    events.push({ coupleId: targetCoupleId, message });
  };
  app.use('/api/ai', aiApplyRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalHabitFindOne = Habit.findOne;
  originalHabitSave = Habit.prototype.save;
});

test.after(async () => {
  User.findById = originalUserFindById;
  Habit.findOne = originalHabitFindOne;
  Habit.prototype.save = originalHabitSave;
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
    nickname: '小赴'
  });
  Habit.findOne = originalHabitFindOne;
  Habit.prototype.save = originalHabitSave;
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

function planPayload(overrides = {}) {
  return {
    planName: 'AI 晨间计划',
    description: '由 AI 生成',
    type: 'simple',
    frequency: 'daily',
    weekdays: [1, 2, 3, 4, 5],
    ...overrides
  };
}

test('AI plan update scopes target habit lookup to the current relationship', async () => {
  let findQuery;
  let saveCalls = 0;

  Habit.findOne = async (query) => {
    findQuery = query;
    return null;
  };
  Habit.prototype.save = async function save() {
    saveCalls += 1;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/ai/apply-plan`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      targetType: 'update',
      targetHabitId: habitId,
      plan: planPayload(),
      requestId: 'ai-update'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, '计划不存在或无权限');
  assert.deepEqual(findQuery, { _id: habitId, coupleId, createdBy: userId });
  assert.equal(saveCalls, 0);
  assert.equal(events.length, 0);
});

test('AI plan create broadcasts habit sync only after save succeeds', async () => {
  Habit.prototype.save = async function save() {
    callOrder.push('save');
    return this;
  };

  const response = await fetch(`${baseUrl}/api/ai/apply-plan`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      targetType: 'new',
      plan: planPayload({ planName: 'AI 新计划' }),
      requestId: 'ai-create'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.coupleId, coupleId);
  assert.equal(body.data.createdBy, userId);
  assert.deepEqual(callOrder, ['save', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'habitSync');
  assert.equal(events[0].message.data.action, 'create');
  assert.equal(events[0].message.data.actor, userId);
  assert.equal(events[0].message.data.requestId, 'ai-create');
  assert.equal(events[0].message.data.payload.title, 'AI 新计划');
});

test('AI plan update saves the current relationship habit before broadcasting', async () => {
  let findQuery;
  const habit = {
    _id: habitId,
    coupleId,
    createdBy: userId,
    title: '旧计划',
    description: '',
    icon: '☀️',
    color: '#EC4899',
    type: 'simple',
    participation: 'both',
    targetDays: 30,
    frequency: 'weekly',
    weekdays: [1],
    subTasks: [],
    numericConfig: {},
    status: 'active',
    startDate: '2026-06-30',
    createdAt: new Date('2026-06-30T00:00:00.000Z'),
    updatedAt: new Date('2026-06-30T00:00:00.000Z'),
    save: async function save() {
      callOrder.push('save');
      return this;
    },
    toObject: function toObject() {
      return {
        _id: this._id,
        coupleId: this.coupleId,
        createdBy: this.createdBy,
        title: this.title,
        description: this.description,
        icon: this.icon,
        color: this.color,
        type: this.type,
        participation: this.participation,
        targetDays: this.targetDays,
        frequency: this.frequency,
        weekdays: this.weekdays,
        subTasks: this.subTasks,
        numericConfig: this.numericConfig,
        status: this.status,
        startDate: this.startDate,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
    }
  };

  Habit.findOne = async (query) => {
    findQuery = query;
    return habit;
  };

  const response = await fetch(`${baseUrl}/api/ai/apply-plan`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      targetType: 'update',
      targetHabitId: habitId,
      plan: planPayload({ planName: 'AI 更新计划', frequency: 'daily' }),
      requestId: 'ai-update'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(findQuery, { _id: habitId, coupleId, createdBy: userId });
  assert.equal(body.data.title, 'AI 更新计划');
  assert.equal(body.data.frequency, 'daily');
  assert.deepEqual(callOrder, ['save', 'broadcast']);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.type, 'habitSync');
  assert.equal(events[0].message.data.action, 'update');
  assert.equal(events[0].message.data.requestId, 'ai-update');
  assert.equal(events[0].message.data.payload.id, habitId);
  assert.equal(events[0].message.data.payload.title, 'AI 更新计划');
});
