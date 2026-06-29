const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, HealthRecord } = require('../models');
const healthRoutes = require('../routes/health');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const recordId = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let events;
let originalUserFindById;
let originalHealthFindOne;
let originalHealthSave;

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
  originalHealthFindOne = HealthRecord.findOne;
  originalHealthSave = HealthRecord.prototype.save;
});

test.after(async () => {
  User.findById = originalUserFindById;
  HealthRecord.findOne = originalHealthFindOne;
  HealthRecord.prototype.save = originalHealthSave;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test.beforeEach(() => {
  events = [];
  User.findById = (id) => ({
    lean: async () => ({
      _id: id,
      partnerId,
      nickname: id === partnerId ? '伴侣' : '小赴'
    })
  });
  HealthRecord.findOne = originalHealthFindOne;
  HealthRecord.prototype.save = originalHealthSave;
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
