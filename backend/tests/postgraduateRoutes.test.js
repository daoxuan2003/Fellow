const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, PostgraduateProgress } = require('../models');
const postgraduateRoutes = require('../routes/postgraduate');
const { getTodayString } = require('../utils/helpers');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let events;
let notifications;
let originalUserFindById;
let originalProgressFindOne;
let originalProgressFindOneAndUpdate;
let originalProgressSave;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    events.push({ coupleId: targetCoupleId, message });
  };
  app.locals.sendNotification = async (targetUserId, payload) => {
    notifications.push({ targetUserId, payload });
  };
  app.use('/api/postgraduate', postgraduateRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalProgressFindOne = PostgraduateProgress.findOne;
  originalProgressFindOneAndUpdate = PostgraduateProgress.findOneAndUpdate;
  originalProgressSave = PostgraduateProgress.prototype.save;
});

test.after(async () => {
  User.findById = originalUserFindById;
  PostgraduateProgress.findOne = originalProgressFindOne;
  PostgraduateProgress.findOneAndUpdate = originalProgressFindOneAndUpdate;
  PostgraduateProgress.prototype.save = originalProgressSave;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test.beforeEach(() => {
  events = [];
  notifications = [];
  User.findById = async (id) => ({
    _id: id,
    partnerId,
    nickname: '小赴'
  });
  PostgraduateProgress.findOne = originalProgressFindOne;
  PostgraduateProgress.findOneAndUpdate = originalProgressFindOneAndUpdate;
  PostgraduateProgress.prototype.save = originalProgressSave;
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

function todayWeekdayKey() {
  const [year, month, day] = getTodayString().split('-').map(Number);
  return String(new Date(year, month - 1, day).getDay());
}

function makeProgress(overrides = {}) {
  return {
    coupleId,
    subjects: [
      {
        name: '数学',
        currentRound: 0,
        rounds: [{ roundName: '一轮', progress: 10, currentUnit: '第1讲', totalUnit: '60讲' }],
        tasks: [{ key: 'math_lecture', label: '完成课程', unit: '讲', targetAmount: 1, cadenceDays: 1, enabled: true, order: 0 }],
        color: '#7c3aed',
        icon: '∫'
      },
      {
        name: '英语',
        currentRound: 0,
        rounds: [{ roundName: '一轮', progress: 20, currentUnit: '阅读', totalUnit: '真题' }],
        tasks: [{ key: 'english_questions', label: '刷题', unit: '题', targetAmount: 40, cadenceDays: 1, enabled: true, order: 0 }],
        color: '#2563eb',
        icon: 'A'
      }
    ],
    weeklySchedule: { [todayWeekdayKey()]: ['数学', '英语'] },
    checkIns: [],
    targetDate: getTodayString(),
    notes: '',
    archiveRepository: {
      name: '考研全过程档案',
      status: 'active',
      createdAt: new Date(),
      lastArchivedAt: null,
      entries: []
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    save: async function save() {
      return this;
    },
    toObject: function toObject() {
      return {
        coupleId: this.coupleId,
        subjects: this.subjects,
        weeklySchedule: this.weeklySchedule,
        checkIns: this.checkIns,
        targetDate: this.targetDate,
        notes: this.notes,
        archiveRepository: this.archiveRepository
      };
    },
    ...overrides
  };
}

test('postgraduate get creates a default exam plan with subject task quotas', async () => {
  let saved;
  PostgraduateProgress.findOne = async () => null;
  PostgraduateProgress.prototype.save = async function save() {
    saved = this;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/postgraduate`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(saved.coupleId, coupleId);
  assert.ok(body.data.subjects.some(subject =>
    subject.name === '数学' && subject.tasks.some(task => task.key === 'math_lecture' && task.unit === '讲')
  ));
  assert.ok(body.data.subjects.some(subject =>
    subject.name === '政治' && subject.tasks.some(task => task.key === 'politics_questions' && task.unit === '题')
  ));
  assert.equal(body.data.archiveRepository.name, '考研全过程档案');
});

test('postgraduate checkin records task completion rate and notifies partner after write', async () => {
  const progress = makeProgress();
  let pushedCheckIn;

  PostgraduateProgress.findOne = async () => progress;
  PostgraduateProgress.findOneAndUpdate = async (query, update) => {
    assert.deepEqual(query, { coupleId });
    if (update.$pull) {
      progress.checkIns = progress.checkIns.filter(checkIn => checkIn.date !== getTodayString());
      return progress;
    }
    pushedCheckIn = update.$push.checkIns;
    progress.checkIns.push(pushedCheckIn);
    return progress;
  };

  const response = await fetch(`${baseUrl}/api/postgraduate/checkin`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      taskRecords: [
        { subjectName: '数学', taskKey: 'math_lecture', completedAmount: 1 },
        { subjectName: '英语', taskKey: 'english_questions', completedAmount: 20 }
      ],
      note: '阅读错题已整理'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(pushedCheckIn.completionRate, 75);
  assert.deepEqual(pushedCheckIn.subjects, ['数学', '英语']);
  assert.equal(pushedCheckIn.taskRecords[0].status, 'done');
  assert.equal(pushedCheckIn.taskRecords[1].status, 'partial');
  assert.equal(events.length, 1);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].targetUserId, partnerId);
  assert.match(notifications[0].payload.body, /完成率 75%/);
});

test('postgraduate checkin keeps legacy subject-only clients compatible with task records', async () => {
  const progress = makeProgress();
  let pushedCheckIn;

  PostgraduateProgress.findOne = async () => progress;
  PostgraduateProgress.findOneAndUpdate = async (query, update) => {
    assert.deepEqual(query, { coupleId });
    if (update.$pull) {
      progress.checkIns = progress.checkIns.filter(checkIn => checkIn.date !== getTodayString());
      return progress;
    }
    pushedCheckIn = update.$push.checkIns;
    progress.checkIns.push(pushedCheckIn);
    return progress;
  };

  const response = await fetch(`${baseUrl}/api/postgraduate/checkin`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      subjects: ['数学'],
      note: '旧版客户端报到'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(pushedCheckIn.completionRate, 50);
  assert.deepEqual(pushedCheckIn.subjects, ['数学']);
  assert.equal(pushedCheckIn.taskRecords[0].status, 'done');
  assert.equal(pushedCheckIn.taskRecords[1].status, 'missed');
});

test('postgraduate archive stores the full process snapshot in a repository entry', async () => {
  const progress = makeProgress({
    checkIns: [{
      date: getTodayString(),
      subjects: ['数学'],
      taskRecords: [{
        subjectName: '数学',
        taskKey: 'math_lecture',
        label: '完成课程',
        unit: '讲',
        targetAmount: 1,
        completedAmount: 1,
        cadenceDays: 1,
        status: 'done'
      }],
      completionRate: 100,
      note: '完成基础课'
    }]
  });
  let saveCalls = 0;
  progress.save = async function save() {
    saveCalls += 1;
    return this;
  };
  PostgraduateProgress.findOne = async () => progress;

  const response = await fetch(`${baseUrl}/api/postgraduate/archive`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ repositoryName: '2027考研全过程档案' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(saveCalls, 1);
  assert.equal(progress.archiveRepository.status, 'archived');
  assert.equal(progress.archiveRepository.entries.length, 1);
  assert.equal(progress.archiveRepository.entries[0].repositoryName, '2027考研全过程档案');
  assert.equal(progress.archiveRepository.entries[0].summary.averageCompletionRate, 100);
  assert.equal(progress.archiveRepository.entries[0].snapshot.checkIns.length, 1);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.data.action, 'archive');
});

test('postgraduate archive rejects snapshots before the target day arrives', async () => {
  const progress = makeProgress({ targetDate: '2999-12-31' });
  let saveCalls = 0;
  progress.save = async function save() {
    saveCalls += 1;
    return this;
  };
  PostgraduateProgress.findOne = async () => progress;

  const response = await fetch(`${baseUrl}/api/postgraduate/archive`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ repositoryName: '提前归档' })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(saveCalls, 0);
  assert.equal(events.length, 0);
});
