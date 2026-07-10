const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, Achievement } = require('../models');
const achievementRoutes = require('../routes/achievements');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let originalUserFindById;
let originalAchievementFindOne;
let originalAchievementSave;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/achievements', achievementRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  originalUserFindById = User.findById;
  originalAchievementFindOne = Achievement.findOne;
  originalAchievementSave = Achievement.prototype.save;
});

test.after(async () => {
  User.findById = originalUserFindById;
  Achievement.findOne = originalAchievementFindOne;
  Achievement.prototype.save = originalAchievementSave;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test.beforeEach(() => {
  User.findById = async (id) => ({
    _id: id,
    partnerId,
    nickname: id === partnerId ? '伴侣' : '小赴'
  });
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

test('achievement migration skips unknown ids and unsafe unlocked dates', async () => {
  const findQueries = [];
  const savedRecords = [];

  Achievement.findOne = async (query) => {
    findQueries.push(query);
    return null;
  };
  Achievement.prototype.save = async function save() {
    savedRecords.push({
      userId: this.userId,
      coupleId: this.coupleId,
      achievementId: this.achievementId,
      unlockedAt: this.unlockedAt,
      progress: this.progress
    });
    return this;
  };

  const response = await fetch(`${baseUrl}/api/achievements/migrate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      unlockedMap: {
        first_checkin: '2026-01-01T00:00:00.000Z',
        unknown_achievement: '2026-01-01T00:00:00.000Z',
        streak_3: 'not-a-date',
        streak_7: '2999-01-01T00:00:00.000Z'
      }
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(body.data.migrated, ['first_checkin']);
  assert.deepEqual(findQueries, [{ userId, achievementId: 'first_checkin' }]);
  assert.equal(savedRecords.length, 1);
  assert.equal(savedRecords[0].userId, userId);
  assert.equal(savedRecords[0].coupleId, coupleId);
  assert.equal(savedRecords[0].achievementId, 'first_checkin');
  assert.equal(savedRecords[0].progress, 1);
  assert.equal(savedRecords[0].unlockedAt.toISOString(), '2026-01-01T00:00:00.000Z');
});

test('achievement migration rejects non-map payloads before loading user data', async () => {
  let userLookups = 0;
  let saveCalls = 0;

  User.findById = async () => {
    userLookups += 1;
    return { _id: userId, partnerId };
  };
  Achievement.prototype.save = async function save() {
    saveCalls += 1;
    return this;
  };

  const response = await fetch(`${baseUrl}/api/achievements/migrate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ unlockedMap: ['first_checkin'] })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(userLookups, 0);
  assert.equal(saveCalls, 0);
});
