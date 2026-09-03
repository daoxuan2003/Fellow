const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, HealthRecord, FitnessDailyLog } = require('../models');
const helpers = require('../utils/helpers');
const { getWorkoutForDate, getWeekPlan } = require('../services/fitnessPlan');
const fitnessRoutes = require('../routes/fitness');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';
const coupleId = [userId, partnerId].sort().join('_');

let server;
let baseUrl;
let events;
let storedLog;
let userGender;
let partnerGender;
let originalUserFindById;
let originalHealthFind;
let originalFitnessFind;
let originalFitnessFindOneAndUpdate;
let originalGetTodayString;
let mutationUpdates;

function authHeaders() {
  const token = jwt.sign({ userId, account: 'fitness-test' }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '5m'
  });
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

function chainLean(value) {
  return {
    select() { return this; },
    sort() { return this; },
    lean: async () => value
  };
}

function setRelationship(options = {}) {
  const reciprocal = options.reciprocal !== false;
  User.findById = (id) => chainLean({
    _id: String(id),
    nickname: String(id) === userId ? '小赴' : '伴侣',
    avatar: '',
    gender: String(id) === userId ? userGender : partnerGender,
    partnerId: String(id) === userId ? partnerId : (reciprocal ? userId : null)
  });
}

function setReadFixtures(logs = [], healthRecords = []) {
  FitnessDailyLog.find = () => chainLean(logs);
  HealthRecord.find = () => chainLean(healthRecords);
}

function applySetPath(target, path, value) {
  const parts = path.split('.');
  let current = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    if (!current[parts[index]]) current[parts[index]] = {};
    current = current[parts[index]];
  }
  current[parts.at(-1)] = value;
}

function installMutationStore() {
  FitnessDailyLog.findOneAndUpdate = async (filter, update) => {
    mutationUpdates.push(update);
    if (!storedLog) {
      storedLog = {
        _id: '333333333333333333333333',
        coupleId: filter.coupleId,
        userId: filter.userId,
        date: filter.date,
        planVersion: update.$set?.planVersion,
        workoutKey: update.$set?.workoutKey,
        exerciseLogs: {},
        mealLogs: {},
        workoutCompletedAt: null,
        updatedAt: new Date()
      };
    }
    if (Array.isArray(update)) {
      const workout = getWorkoutForDate(userGender, helpers.getTodayString());
      const completed = workout.exercises.length > 0 && workout.exercises.every(
        exercise => storedLog.exerciseLogs[exercise.key]?.completed
      );
      storedLog.workoutCompletedAt = completed
        ? (storedLog.workoutCompletedAt || new Date())
        : null;
      return storedLog;
    }
    for (const [path, value] of Object.entries(update.$set || {})) {
      applySetPath(storedLog, path, value);
    }
    return storedLog;
  };
}

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.locals.broadcastToCouple = (targetCoupleId, message) => {
    events.push({ coupleId: targetCoupleId, message });
  };
  app.use('/api/fitness', fitnessRoutes);
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  originalUserFindById = User.findById;
  originalHealthFind = HealthRecord.find;
  originalFitnessFind = FitnessDailyLog.find;
  originalFitnessFindOneAndUpdate = FitnessDailyLog.findOneAndUpdate;
  originalGetTodayString = helpers.getTodayString;
});

test.after(async () => {
  User.findById = originalUserFindById;
  HealthRecord.find = originalHealthFind;
  FitnessDailyLog.find = originalFitnessFind;
  FitnessDailyLog.findOneAndUpdate = originalFitnessFindOneAndUpdate;
  helpers.getTodayString = originalGetTodayString;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test.beforeEach(() => {
  events = [];
  mutationUpdates = [];
  storedLog = null;
  userGender = 'female';
  partnerGender = 'male';
  setRelationship();
  setReadFixtures();
  installMutationStore();
  helpers.getTodayString = () => '2026-09-02';
});

test('fitness plan uses fixed female supported movements without squat-pattern exercises', async () => {
  const response = await fetch(`${baseUrl}/api/fitness`, { headers: authHeaders() });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.mine.profile.squatPatternPolicy.includes('不按时间自动解锁'), true);
  const allFemaleExercises = getWeekPlan('female', body.data.today)
    .flatMap(day => day.workout.exercises || []);
  const serialized = JSON.stringify(allFemaleExercises);
  assert.doesNotMatch(serialized, /深蹲|腿举|箭步蹲|登阶/);
  assert.equal(body.data.mine.today.workout.durationMinutes, body.data.mine.today.workout.type === 'rest' ? 0 : 30);
});

test('fitness list returns real latest health values and leaves missing partner health empty', async () => {
  setReadFixtures([], [{
    userId,
    coupleId,
    recordedAt: new Date('2026-09-01T00:00:00.000Z'),
    weight: 79.5,
    bodyFat: 31,
    measurements: { waist: 88 }
  }]);

  const response = await fetch(`${baseUrl}/api/fitness`, { headers: authHeaders() });
  const body = await response.json();

  assert.equal(body.data.mine.health.weight, 79.5);
  assert.equal(body.data.mine.health.waist, 88);
  assert.equal(body.data.partner.health, null);
});

test('fitness list keeps missing optional health numbers empty instead of fabricating zero', async () => {
  setReadFixtures([], [{
    userId,
    coupleId,
    recordedAt: new Date('2026-09-01T00:00:00.000Z'),
    weight: null,
    bodyFat: null,
    measurements: { waist: null }
  }]);

  const response = await fetch(`${baseUrl}/api/fitness`, { headers: authHeaders() });
  const body = await response.json();

  assert.equal(body.data.mine.health.weight, null);
  assert.equal(body.data.mine.health.waist, null);
  assert.equal(body.data.mine.health.bodyFat, null);
});

test('exercise mutation ignores client identity and writes authenticated owner before sync', async () => {
  const today = helpers.getTodayString();
  const exercise = getWorkoutForDate(userGender, today).exercises[0];
  const payload = { completed: true, userId: partnerId, weightKg: 12 };
  if (exercise.tracking === 'reps') payload.actualReps = Array(exercise.sets).fill(exercise.reps);
  if (exercise.tracking === 'seconds') payload.actualSeconds = Array(exercise.sets).fill(exercise.seconds);
  if (exercise.tracking === 'minutes') payload.durationMinutes = exercise.minutes;

  const response = await fetch(`${baseUrl}/api/fitness/today/exercises/${exercise.key}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(storedLog.userId, userId);
  assert.equal(storedLog.coupleId, coupleId);
  assert.equal(storedLog.exerciseLogs[exercise.key].completed, true);
  assert.equal(events.length, 1);
  assert.equal(events[0].coupleId, coupleId);
  assert.equal(events[0].message.type, 'fitnessSync');
  assert.equal(events[0].message.data.actor, userId);
  const upsert = mutationUpdates[0];
  assert.deepEqual(
    Object.keys(upsert.$setOnInsert).filter(key => Object.hasOwn(upsert.$set, key)),
    []
  );
});

test('exercise mutation requires one real entry for every fixed set', async () => {
  const today = helpers.getTodayString();
  const exercise = getWorkoutForDate(userGender, today).exercises.find(item => item.tracking === 'reps');

  const response = await fetch(`${baseUrl}/api/fitness/today/exercises/${exercise.key}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ completed: true, actualReps: [exercise.reps] })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.message, /完整记录/);
  assert.equal(storedLog, null);
  assert.equal(events.length, 0);
});

test('workout completion is derived atomically after every planned exercise is recorded', async () => {
  const today = helpers.getTodayString();
  const workout = getWorkoutForDate(userGender, today);

  for (const exercise of workout.exercises) {
    const payload = { completed: true };
    if (exercise.tracking === 'reps') payload.actualReps = Array(exercise.sets).fill(exercise.reps);
    if (exercise.tracking === 'seconds') payload.actualSeconds = Array(exercise.sets).fill(exercise.seconds);
    if (exercise.tracking === 'minutes') payload.durationMinutes = exercise.minutes;
    const response = await fetch(`${baseUrl}/api/fitness/today/exercises/${exercise.key}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    assert.equal(response.status, 200);
  }

  assert.ok(storedLog.workoutCompletedAt);
  assert.equal(mutationUpdates.filter(Array.isArray).length, workout.exercises.length);
  assert.equal(events.at(-1).message.data.payload.workoutCompleted, true);
});

test('meal mutation validates slot, keeps note and writes only current user log', async () => {
  const response = await fetch(`${baseUrl}/api/fitness/today/meals/lunch`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status: 'on_plan', note: '食堂鸡肉、青菜和半份米饭', userId: partnerId })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(storedLog.userId, userId);
  assert.equal(storedLog.mealLogs.lunch.status, 'on_plan');
  assert.equal(storedLog.mealLogs.lunch.note, '食堂鸡肉、青菜和半份米饭');
  assert.equal(events.length, 1);
  assert.equal(events[0].message.data.action, 'mealUpdate');
});

test('fitness routes reject a stale non-reciprocal relationship', async () => {
  setRelationship({ reciprocal: false });
  const response = await fetch(`${baseUrl}/api/fitness`, { headers: authHeaders() });
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.success, false);
  assert.equal(events.length, 0);
});

test('fitness summary reports only persisted completion state', async () => {
  setReadFixtures([{
    coupleId,
    userId,
    date: helpers.getTodayString(),
    workoutCompletedAt: new Date()
  }]);
  const response = await fetch(`${baseUrl}/api/fitness/summary`, { headers: authHeaders() });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.completed, true);
  assert.equal(body.data.partnerCompleted, false);
});
