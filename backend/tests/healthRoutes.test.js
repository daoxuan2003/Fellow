const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, HealthRecord, MenstrualRecord } = require('../models');
const healthRoutes = require('../routes/health');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const recordId = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let events;
let originalUserFindById;
let originalHealthFind;
let originalHealthFindOne;
let originalHealthSave;
let originalMenstrualFindOne;
let originalMenstrualFind;
let originalMenstrualSave;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    events.push({ coupleId: targetCoupleId, message });
  };
  app.locals.sendNotification = () => {};
  app.use('/api/health', healthRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalHealthFind = HealthRecord.find;
  originalHealthFindOne = HealthRecord.findOne;
  originalHealthSave = HealthRecord.prototype.save;
  originalMenstrualFindOne = MenstrualRecord.findOne;
  originalMenstrualFind = MenstrualRecord.find;
  originalMenstrualSave = MenstrualRecord.prototype.save;
});

test.after(async () => {
  User.findById = originalUserFindById;
  HealthRecord.find = originalHealthFind;
  HealthRecord.findOne = originalHealthFindOne;
  HealthRecord.prototype.save = originalHealthSave;
  MenstrualRecord.findOne = originalMenstrualFindOne;
  MenstrualRecord.find = originalMenstrualFind;
  MenstrualRecord.prototype.save = originalMenstrualSave;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test.beforeEach(() => {
  events = [];
  setUserGenders('female', 'female');
  HealthRecord.find = originalHealthFind;
  HealthRecord.findOne = originalHealthFindOne;
  HealthRecord.prototype.save = originalHealthSave;
  MenstrualRecord.findOne = originalMenstrualFindOne;
  MenstrualRecord.find = originalMenstrualFind;
  MenstrualRecord.prototype.save = originalMenstrualSave;
});

function setUserGenders(userGender, partnerGender) {
  User.findById = (id) => ({
    lean: async () => ({
      _id: id,
      partnerId: id === userId ? partnerId : userId,
      nickname: id === partnerId ? '伴侣' : '小赴',
      gender: id === partnerId ? partnerGender : userGender
    })
  });
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

test('health create ignores client targetUserId and writes as authenticated user', async () => {
  let findQuery;
  let savedRecord;

  HealthRecord.findOne = async (query) => {
    findQuery = query;
    return null;
  };
  HealthRecord.prototype.save = async function save() {
    savedRecord = this;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/health`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      targetUserId: partnerId,
      weight: 61,
      recordedAt: '2026-06-29'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(findQuery.userId, userId);
  assert.equal(findQuery.coupleId, coupleId);
  assert.equal(String(savedRecord.userId), userId);
  assert.equal(savedRecord.weight, 61);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.data.payload.userId, userId);
});

test('health list serializes health record dates as local date strings', async () => {
  HealthRecord.find = (query) => {
    assert.deepEqual(query, { coupleId });
    return {
      sort: (sortQuery) => {
        assert.deepEqual(sortQuery, { recordedAt: -1, updatedAt: -1, createdAt: -1 });
        return {
          lean: async () => [
            {
              _id: 'mine-record',
              userId,
              coupleId,
              recordedAt: new Date('2026-06-28T16:00:00.000Z'),
              weight: 61,
              measurements: {}
            },
            {
              _id: 'partner-record',
              userId: partnerId,
              coupleId,
              recordedAt: '2026-06-29T00:00:00.000Z',
              weight: 70,
              measurements: {}
            }
          ]
        };
      }
    };
  };

  const response = await fetch(`${baseUrl}/api/health`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.mine[0].recordedAt, '2026-06-29');
  assert.equal(body.data.partner[0].recordedAt, '2026-06-29');
});

test('health create rejects invalid recordedAt before querying or saving', async () => {
  let findCalls = 0;
  let saveCalls = 0;

  HealthRecord.findOne = async () => {
    findCalls += 1;
    return null;
  };
  HealthRecord.prototype.save = async function save() {
    saveCalls += 1;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/health`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      weight: 61,
      recordedAt: '2026-02-31'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(body.message, /记录日期格式不正确/);
  assert.equal(findCalls, 0);
  assert.equal(saveCalls, 0);
  assert.equal(events.length, 0);
});

test('health create rejects unreasonable metric values before saving', async () => {
  let findCalls = 0;
  let saveCalls = 0;

  HealthRecord.findOne = async () => {
    findCalls += 1;
    return null;
  };
  HealthRecord.prototype.save = async function save() {
    saveCalls += 1;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/health`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      weight: -5,
      recordedAt: '2026-06-29'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(body.message, /体重超出合理范围/);
  assert.equal(findCalls, 0);
  assert.equal(saveCalls, 0);
  assert.equal(events.length, 0);
});

test('health create normalizes blank and string numeric fields', async () => {
  let savedRecord;

  HealthRecord.findOne = async () => null;
  HealthRecord.prototype.save = async function save() {
    savedRecord = this;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/health`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      height: '172.26',
      weight: '',
      bodyFat: '0',
      measurements: {
        chest: ' ',
        waist: '64.24'
      },
      note: '  加练后记录  ',
      recordedAt: '2026-06-29'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(savedRecord.height, 172.3);
  assert.equal(savedRecord.weight, null);
  assert.equal(savedRecord.bodyFat, 0);
  assert.equal(savedRecord.measurements.chest, null);
  assert.equal(savedRecord.measurements.waist, 64.2);
  assert.equal(savedRecord.note, '加练后记录');
  assert.equal(events.length, 1);
});

test('health update rejects partner owned generic health records', async () => {
  let saveCalls = 0;

  HealthRecord.findOne = async (query) => {
    assert.deepEqual(query, { _id: recordId, coupleId });
    return {
      _id: recordId,
      userId: partnerId,
      coupleId,
      save: async () => {
        saveCalls += 1;
      }
    };
  };

  const response = await fetch(`${baseUrl}/api/health/${recordId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ weight: 62 })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(saveCalls, 0);
  assert.equal(events.length, 0);
});

test('health update rejects invalid recordedAt before saving', async () => {
  let saveCalls = 0;

  HealthRecord.findOne = async (query) => {
    assert.deepEqual(query, { _id: recordId, coupleId });
    return {
      _id: recordId,
      userId,
      coupleId,
      measurements: {},
      save: async () => {
        saveCalls += 1;
      }
    };
  };

  const response = await fetch(`${baseUrl}/api/health/${recordId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ recordedAt: 'not-a-date' })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(body.message, /记录日期格式不正确/);
  assert.equal(saveCalls, 0);
  assert.equal(events.length, 0);
});

test('health update rejects invalid measurement values before saving', async () => {
  let saveCalls = 0;

  HealthRecord.findOne = async () => ({
    _id: recordId,
    userId,
    coupleId,
    measurements: {},
    save: async () => {
      saveCalls += 1;
    }
  });

  const response = await fetch(`${baseUrl}/api/health/${recordId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ measurements: { waist: 500 } })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(body.message, /腰围超出合理范围/);
  assert.equal(saveCalls, 0);
  assert.equal(events.length, 0);
});

test('health trends rejects unsupported metric before querying records', async () => {
  let findCalls = 0;

  HealthRecord.find = () => {
    findCalls += 1;
    throw new Error('should not query health trends');
  };

  const response = await fetch(`${baseUrl}/api/health/trends?metric=__proto__`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(body.message, /不支持的趋势指标/);
  assert.equal(findCalls, 0);
});

test('health trends falls back invalid days and returns finite known metric values', async () => {
  let findQuery;

  HealthRecord.find = (query) => {
    findQuery = query;
    return {
      sort: (sortQuery) => {
        assert.deepEqual(sortQuery, { recordedAt: 1 });
        return {
          lean: async () => [
            {
              userId: { toString: () => userId },
              coupleId,
              recordedAt: '2026-06-29T10:00:00.000Z',
              measurements: { waist: '64.2' }
            },
            {
              userId: partnerId,
              coupleId,
              recordedAt: '2026-06-30T10:00:00.000Z',
              measurements: { waist: null }
            },
            {
              userId: partnerId,
              coupleId,
              recordedAt: '2026-06-30T10:00:00.000Z',
              measurements: { waist: 72 }
            }
          ]
        };
      }
    };
  };

  const response = await fetch(`${baseUrl}/api/health/trends?metric=waist&days=abc`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.metric, 'waist');
  assert.equal(findQuery.coupleId, coupleId);
  assert.ok(findQuery.recordedAt.$gte instanceof Date);
  assert.equal(Number.isNaN(findQuery.recordedAt.$gte.getTime()), false);
  assert.deepEqual(body.data.mine, [{ date: '2026-06-29', value: 64.2 }]);
  assert.deepEqual(body.data.partner, [{ date: '2026-06-30', value: 72 }]);
});

test('menstrual start rejects female user writing partner cycle records', async () => {
  let saveCalls = 0;

  setUserGenders('female', 'female');
  MenstrualRecord.findOne = async () => null;
  MenstrualRecord.prototype.save = async function save() {
    saveCalls += 1;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/health/menstrual/start`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      targetUserId: partnerId,
      cycleStart: '2026-06-29'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(saveCalls, 0);
  assert.equal(events.length, 0);
});

test('menstrual read returns empty data for male self target', async () => {
  let findCalls = 0;

  setUserGenders('male', 'female');
  MenstrualRecord.findOne = () => {
    findCalls += 1;
    throw new Error('should not query menstrual records');
  };

  const response = await fetch(`${baseUrl}/api/health/menstrual?targetUserId=${userId}`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(body.data, { current: null, history: [], prediction: null });
  assert.equal(findCalls, 0);
});

test('menstrual read returns empty data for non-female partner target', async () => {
  let findCalls = 0;

  setUserGenders('male', 'male');
  MenstrualRecord.findOne = () => {
    findCalls += 1;
    throw new Error('should not query menstrual records');
  };

  const response = await fetch(`${baseUrl}/api/health/menstrual?targetUserId=${partnerId}`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(body.data, { current: null, history: [], prediction: null });
  assert.equal(findCalls, 0);
});

test('menstrual start allows male user writing female partner cycle records', async () => {
  let savedRecord;

  setUserGenders('male', 'female');
  MenstrualRecord.findOne = async (query) => {
    assert.equal(query.userId, partnerId);
    assert.equal(query.coupleId, coupleId);
    assert.equal(query.status, 'ongoing');
    return null;
  };
  MenstrualRecord.prototype.save = async function save() {
    savedRecord = this;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/health/menstrual/start`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      targetUserId: partnerId,
      cycleStart: '2026-06-29'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(String(savedRecord.userId), partnerId);
  assert.equal(savedRecord.coupleId, coupleId);
  assert.equal(events.length, 1);
  assert.equal(events[0].message.data.actor, userId);
  assert.equal(events[0].message.data.payload.userId, partnerId);
});

test('menstrual flow rejects partner target when partner is not female', async () => {
  let findCalls = 0;
  let saveCalls = 0;

  setUserGenders('male', 'male');
  MenstrualRecord.findOne = async () => {
    findCalls += 1;
    return null;
  };
  MenstrualRecord.prototype.save = async function save() {
    saveCalls += 1;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/health/menstrual/flow`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      targetUserId: partnerId,
      date: '2026-06-29',
      flowLevel: 3
    })
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(findCalls, 0);
  assert.equal(saveCalls, 0);
  assert.equal(events.length, 0);
});

test('menstrual start rejects invalid date-only values before saving', async () => {
  let findCalls = 0;
  let saveCalls = 0;

  MenstrualRecord.findOne = async () => {
    findCalls += 1;
    return null;
  };
  MenstrualRecord.prototype.save = async function save() {
    saveCalls += 1;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/health/menstrual/start`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ cycleStart: '2026-02-31' })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(body.message, /开始日期格式不正确/);
  assert.equal(findCalls, 0);
  assert.equal(saveCalls, 0);
  assert.equal(events.length, 0);
});

test('menstrual start rejects a new cycle that would cut across recorded flow days', async () => {
  let ongoingSaveCalls = 0;
  let newRecordSaveCalls = 0;

  MenstrualRecord.findOne = async () => ({
    cycleStart: '2026-06-20',
    flowRecords: [{ date: '2026-06-28', flowLevel: 3 }],
    save: async () => {
      ongoingSaveCalls += 1;
    }
  });
  MenstrualRecord.prototype.save = async function save() {
    newRecordSaveCalls += 1;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/health/menstrual/start`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ cycleStart: '2026-06-25' })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(body.message, /不能早于已记录的出血日期/);
  assert.equal(ongoingSaveCalls, 0);
  assert.equal(newRecordSaveCalls, 0);
  assert.equal(events.length, 0);
});

test('menstrual end rejects dates before the active cycle start', async () => {
  let saveCalls = 0;

  MenstrualRecord.findOne = () => ({
    sort: async () => ({
      cycleStart: '2026-06-20',
      save: async () => {
        saveCalls += 1;
      }
    })
  });

  const response = await fetch(`${baseUrl}/api/health/menstrual/end`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ cycleEnd: '2026-06-19' })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(body.message, /结束日期不能早于开始日期/);
  assert.equal(saveCalls, 0);
  assert.equal(events.length, 0);
});

test('menstrual flow rejects check-ins before the active cycle start', async () => {
  let saveCalls = 0;

  MenstrualRecord.findOne = () => ({
    sort: async () => ({
      cycleStart: '2026-06-20',
      flowRecords: [],
      save: async () => {
        saveCalls += 1;
      }
    })
  });

  const response = await fetch(`${baseUrl}/api/health/menstrual/flow`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      date: '2026-06-19',
      flowLevel: 3
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(body.message, /打卡日期不能早于当前周期开始日期/);
  assert.equal(saveCalls, 0);
  assert.equal(events.length, 0);
});

function completedCycle(start, end, flowRecords = []) {
  return {
    _id: `${start}-record`,
    userId,
    coupleId,
    status: 'completed',
    cycleStart: start,
    cycleEnd: end,
    flowRecords
  };
}

function stubMenstrualRead({ current = null, history = [] }) {
  MenstrualRecord.findOne = () => ({
    sort: async () => current
  });
  MenstrualRecord.find = () => ({
    sort: () => ({
      limit: async () => history
    })
  });
}

test('menstrual prediction uses inclusive period length and stable recent cycles', async () => {
  setUserGenders('female', 'female');
  stubMenstrualRead({
    history: [
      completedCycle('2026-06-01', '2026-06-05', [
        { date: '2026-06-01', flowLevel: 2 },
        { date: '2026-06-02', flowLevel: 5 },
        { date: '2026-06-03', flowLevel: 3 }
      ]),
      completedCycle('2026-05-04', '2026-05-08'),
      completedCycle('2026-04-06', '2026-04-10'),
      completedCycle('2026-03-09', '2026-03-13'),
      completedCycle('2026-02-09', '2026-02-13'),
      completedCycle('2026-01-12', '2026-01-16')
    ]
  });

  const response = await fetch(`${baseUrl}/api/health/menstrual?targetUserId=${userId}`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.prediction.nextPeriod.predictedDate, '2026-06-29');
  assert.deepEqual(body.data.prediction.nextPeriod.dateRange, {
    min: '2026-06-27',
    max: '2026-07-01'
  });
  assert.deepEqual({
    start: body.data.prediction.nextPeriod.window.start,
    peak: body.data.prediction.nextPeriod.window.peak,
    end: body.data.prediction.nextPeriod.window.end,
    totalDays: body.data.prediction.nextPeriod.window.totalDays
  }, {
    start: '2026-06-27',
    peak: '2026-06-29',
    end: '2026-07-01',
    totalDays: 5
  });
  assert.equal(typeof body.data.prediction.nextPeriod.window.progressPercent, 'number');
  assert.ok(['before', 'peak', 'inside_before_peak', 'inside_after_peak', 'after'].includes(body.data.prediction.nextPeriod.window.status));
  assert.equal(body.data.prediction.nextPeriod.confidence, 'high');
  assert.equal(body.data.prediction.nextPeriod.windowLabel, '±2天');
  assert.match(body.data.prediction.nextPeriod.reason, /最近 5 个周期集中/);
  assert.equal(body.data.prediction.cycle.avgLength, 28);
  assert.equal(body.data.prediction.cycle.avgPeriodLength, 5);
  assert.equal(body.data.prediction.cycle.regularity, 'very_regular');
  assert.equal(body.data.prediction.cycle.evidence.qualityLabel, '可信度高');
  assert.ok(body.data.prediction.cycle.evidence.anchors.length >= 6);
  assert.ok(body.data.prediction.carePlan.some(action => action.type === 'stable_reminder'));
  assert.equal(body.data.prediction.heaviestDay, 2);
  assert.equal(body.data.prediction.ovulation.predictedDate, '2026-06-15');
  assert.deepEqual(body.data.prediction.ovulation.fertileWindow, {
    start: '2026-06-10',
    end: '2026-06-16'
  });
});

test('menstrual prediction calibrates likely missed cycles without shifting the rhythm', async () => {
  setUserGenders('female', 'female');
  stubMenstrualRead({
    history: [
      completedCycle('2026-06-01', '2026-06-05'),
      completedCycle('2026-05-04', '2026-05-08'),
      completedCycle('2026-03-09', '2026-03-13'),
      completedCycle('2026-02-09', '2026-02-13'),
      completedCycle('2026-01-12', '2026-01-16'),
      completedCycle('2025-12-15', '2025-12-19')
    ]
  });

  const response = await fetch(`${baseUrl}/api/health/menstrual?targetUserId=${userId}`, {
    headers: authHeaders()
  });
  const body = await response.json();
  const prediction = body.data.prediction;

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(prediction.nextPeriod.predictedDate, '2026-06-29');
  assert.deepEqual(prediction.nextPeriod.dateRange, {
    min: '2026-06-24',
    max: '2026-07-04'
  });
  assert.equal(prediction.nextPeriod.confidence, 'medium');
  assert.match(prediction.nextPeriod.reason, /疑似漏记周期/);
  assert.match(prediction.nextPeriod.basis, /校准 1 个疑似漏记/);
  assert.equal(prediction.cycle.avgLength, 28);
  assert.equal(prediction.cycle.regularity, 'somewhat_regular');
  assert.equal(prediction.cycle.regularityLabel, '规律但有漏记');
  assert.equal(prediction.cycle.anomalySummary.possibleMissingCycleCount, 1);
  assert.equal(prediction.cycle.adjustedStdDeviation, 0);
  assert.equal(prediction.cycle.evidence.qualityLabel, '已校准');
  assert.equal(prediction.cycle.evidence.possibleMissingCycleCount, 1);
  assert.ok(prediction.insights.some(insight => insight.type === 'possible_missing_cycle'));
});

test('menstrual prediction flags irregular cycles and widens prediction window', async () => {
  setUserGenders('female', 'female');
  stubMenstrualRead({
    history: [
      completedCycle('2026-06-01', '2026-06-05'),
      completedCycle('2026-04-20', '2026-04-24'),
      completedCycle('2026-03-25', '2026-03-29'),
      completedCycle('2026-02-10', '2026-02-14'),
      completedCycle('2026-01-20', '2026-01-24')
    ]
  });

  const response = await fetch(`${baseUrl}/api/health/menstrual?targetUserId=${userId}`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.prediction.cycle.regularity, 'irregular');
  assert.ok(body.data.prediction.cycle.stdDeviation >= 8);
  assert.ok(body.data.prediction.nextPeriod.uncertaintyDays >= 7);
  assert.equal(body.data.prediction.nextPeriod.confidence, 'low');
  assert.equal(body.data.prediction.cycle.evidence.qualityLabel, '只看范围');
  assert.ok(body.data.prediction.nextPeriod.urgencyLabel);
  assert.ok(body.data.prediction.carePlan.some(action => action.type === 'range_focus'));
  assert.ok(body.data.prediction.insights.some(insight => insight.type === 'irregular_cycle'));
  assert.ok(body.data.prediction.insights.some(insight => insight.type === 'long_cycle'));
});

test('menstrual prediction explains recent cycle lengthening trend', async () => {
  setUserGenders('female', 'female');
  stubMenstrualRead({
    history: [
      completedCycle('2026-06-20', '2026-06-24'),
      completedCycle('2026-05-16', '2026-05-20'),
      completedCycle('2026-04-12', '2026-04-16'),
      completedCycle('2026-03-10', '2026-03-14'),
      completedCycle('2026-02-11', '2026-02-15'),
      completedCycle('2026-01-16', '2026-01-20'),
      completedCycle('2025-12-21', '2025-12-25')
    ]
  });

  const response = await fetch(`${baseUrl}/api/health/menstrual?targetUserId=${userId}`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.prediction.cycle.evidence.trend.direction, 'lengthening');
  assert.match(body.data.prediction.cycle.evidence.trend.description, /长约/);
  assert.ok(body.data.prediction.cycle.evidence.anchors.some(anchor => anchor.label === '趋势'));
});
