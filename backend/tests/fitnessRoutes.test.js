const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const express = require('express');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/auth');
const { User, HealthRecord, FitnessDailyLog } = require('../models');
const helpers = require('../utils/helpers');
const {
  PLAN_VERSION,
  getWorkoutForDate,
  getWeekPlan,
  getExerciseHistoryDefinitions
} = require('../services/fitnessPlan');
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
let originalFitnessAggregate;
let originalFitnessFindOneAndUpdate;
let originalGetTodayString;
let mutationUpdates;
let historyFixtures;
let historyPipelines;

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
  historyFixtures = logs;
}

function fieldAt(value, path) {
  return path.split('.').reduce((current, key) => current?.[key], value);
}

function matchesQuery(value, query) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') return expected.some(condition => matchesQuery(value, condition));
    const actual = fieldAt(value, key);
    if (expected && typeof expected === 'object') {
      return Object.entries(expected).every(([operator, operand]) => {
        if (operator === '$in') return operand.includes(actual);
        if (operator === '$lte') return actual <= operand;
        throw new Error(`Unsupported fixture query operator: ${operator}`);
      });
    }
    return expected === null ? actual == null : actual === expected;
  });
}

// Evaluate the read boundary and facet contracts against synthetic documents.
// This catches missing owner/couple/date filters without using a real database.
function installHistoryStore() {
  FitnessDailyLog.aggregate = async (pipeline, options) => {
    assert.equal(options.maxTimeMS, 5000);
    historyPipelines.push(pipeline);
    const match = pipeline[0].$match;
    const rows = historyFixtures.filter(log => matchesQuery(log, match))
      .flatMap(log => Object.entries(log.exerciseLogs || {}).map(([k, v]) => ({
        userId: log.userId, date: log.date, exerciseLogs: { k, v }
      })))
      .filter(row => matchesQuery(row, pipeline[3].$match));
    const result = {};
    for (const [key, stages] of Object.entries(pipeline[4].$facet)) {
      const filtered = rows.filter(row => matchesQuery(row, stages[0].$match))
        .sort((left, right) => right.date.localeCompare(left.date))
        .slice(0, stages[2].$limit);
      result[key] = filtered.map(row => Object.fromEntries(
        Object.entries(stages[3].$project)
          .filter(([, source]) => source !== 0)
          .map(([field, source]) => [field, source === 1 ? row[field] : fieldAt(row, source.slice(1))])
      ));
    }
    return [result];
  };
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
  originalFitnessAggregate = FitnessDailyLog.aggregate;
  originalFitnessFindOneAndUpdate = FitnessDailyLog.findOneAndUpdate;
  originalGetTodayString = helpers.getTodayString;
});

test.after(async () => {
  User.findById = originalUserFindById;
  HealthRecord.find = originalHealthFind;
  FitnessDailyLog.find = originalFitnessFind;
  FitnessDailyLog.aggregate = originalFitnessAggregate;
  FitnessDailyLog.findOneAndUpdate = originalFitnessFindOneAndUpdate;
  helpers.getTodayString = originalGetTodayString;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test.beforeEach(() => {
  events = [];
  mutationUpdates = [];
  historyPipelines = [];
  storedLog = null;
  userGender = 'female';
  partnerGender = 'male';
  setRelationship();
  setReadFixtures();
  installHistoryStore();
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

test('history remembers earlier aliases beyond 42 days and excludes today from previous exercise', async () => {
  helpers.getTodayString = () => '2026-09-04';
  const makeLog = (date, key, weightKg, extra = {}) => ({
    coupleId,
    userId,
    date,
    planVersion: PLAN_VERSION,
    exerciseLogs: {
      [key]: {
        completed: true,
        actualReps: [12, 11, 0],
        weightKg,
        note: 'must never leave the history projection'
      }
    },
    ...extra
  });
  setReadFixtures([
    makeLog('2026-09-04', 'leg_extension_c', 25),
    makeLog('2026-07-06', 'leg_extension_a', 20, { planVersion: undefined }),
    makeLog('2026-06-29', 'leg_extension_a', 15, { planVersion: null }),
    makeLog('2026-09-05', 'leg_extension_a', 90),
    makeLog('2026-08-31', 'leg_extension_a', 85, { planVersion: 'future-incompatible-plan' }),
    makeLog('2026-08-28', 'leg_extension_c', 80, { coupleId: 'different_couple' }),
    makeLog('2026-08-24', 'leg_extension_a', 75, { userId: 'unrelated_user' }),
    makeLog('2026-08-21', 'leg_extension_c', 70, {
      exerciseLogs: { leg_extension_c: { completed: false, actualReps: [12, 12, 12], weightKg: 70 } }
    })
  ]);
  const response = await fetch(`${baseUrl}/api/fitness?userId=unrelated_user&coupleId=different_couple`, {
    headers: authHeaders()
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  const history = body.data.mine.exerciseHistory.find(item => item.key === 'leg_extension');
  assert.deepEqual(history.records.map(record => record.date), ['2026-09-04', '2026-07-06', '2026-06-29']);
  assert.equal(history.exercise.label, '坐姿腿屈伸');
  const previous = body.data.mine.today.previousExercises.leg_extension_c;
  assert.equal(previous.date, '2026-07-06');
  assert.equal(previous.weightKg, 20);
  assert.deepEqual(previous.actualReps, [12, 11, 0]);
  assert.equal(body.data.mine.today.previousExercises.leg_curl_c, null);
  assert.deepEqual(body.data.partner.exerciseHistory, []);
  assert.deepEqual(Object.keys(previous).sort(), [
    'actualReps', 'actualSeconds', 'completed', 'completedAt', 'date', 'durationMinutes', 'weightKg'
  ].sort());
  assert.doesNotMatch(JSON.stringify(history), /must never|coupleId|userId/);
  assert.deepEqual(historyPipelines[0][0].$match.userId, { $in: [userId, partnerId] });
  assert.equal(historyPipelines[0][0].$match.coupleId, coupleId);
  assert.deepEqual(historyPipelines[0][0].$match.date, { $lte: '2026-09-04' });
});

test('history caps every exercise at 12 records and keeps both participants separate', async () => {
  helpers.getTodayString = () => '2026-09-04';
  const logs = Array.from({ length: 16 }, (_, index) => ({
    coupleId,
    userId,
    date: `2026-08-${String(31 - index).padStart(2, '0')}`,
    planVersion: PLAN_VERSION,
    exerciseLogs: { seated_row_a: { completed: true, actualReps: [10, 10], weightKg: 16 - index } }
  }));
  logs.push({
    coupleId,
    userId: partnerId,
    date: '2026-08-31',
    planVersion: PLAN_VERSION,
    exerciseLogs: { seated_row: { completed: true, actualReps: [10, 9, 8], weightKg: 65 } }
  });
  setReadFixtures(logs);
  const response = await fetch(`${baseUrl}/api/fitness`, { headers: authHeaders() });
  const { data } = await response.json();
  const mine = data.mine.exerciseHistory.find(item => item.key === 'seated_row');
  const partner = data.partner.exerciseHistory.find(item => item.key === 'seated_row');

  assert.equal(mine.records.length, 12);
  assert.equal(mine.records[0].weightKg, 16);
  assert.equal(mine.records.at(-1).weightKg, 5);
  assert.equal(partner.records.length, 1);
  assert.equal(partner.records[0].weightKg, 65);
  assert.equal(data.mine.today.previousExercises.seated_row_c.weightKg, 16);
  for (const stages of Object.values(historyPipelines[0][4].$facet)) {
    assert.equal(stages[2].$limit, 13);
    assert.deepEqual(stages[1].$sort, { date: -1 });
  }
});

test('history maps only explicitly identical movement variants and preserves empty state', async () => {
  const male = getExerciseHistoryDefinitions('male');
  assert.deepEqual(male.find(item => item.key === 'lat_pulldown').exerciseKeys,
    ['lat_pulldown', 'lat_pulldown_focus']);
  assert.deepEqual(male.find(item => item.key === 'incline_press').exerciseKeys,
    ['incline_press', 'incline_press_focus']);
  assert.deepEqual(male.find(item => item.key === 'flat_press').exerciseKeys, ['flat_press']);
  assert.equal(male.some(item => item.exerciseKeys.includes('哑铃卧推')), false);

  const response = await fetch(`${baseUrl}/api/fitness`, { headers: authHeaders() });
  const { data } = await response.json();
  assert.deepEqual(data.mine.exerciseHistory, []);
  assert.equal(Object.values(data.mine.today.previousExercises).every(value => value === null), true);
});

test('fitness history requires authentication and reciprocal relationship before reading data', async () => {
  const unauthenticated = await fetch(`${baseUrl}/api/fitness`);
  assert.equal(unauthenticated.status, 401);
  assert.equal(historyPipelines.length, 0);
  setRelationship({ reciprocal: false });
  const staleRelationship = await fetch(`${baseUrl}/api/fitness`, { headers: authHeaders() });
  assert.equal(staleRelationship.status, 409);
  assert.equal(historyPipelines.length, 0);
});

test('actual exercise values allow explicit zero without claiming the target was met', async () => {
  const workout = getWorkoutForDate(userGender, helpers.getTodayString());
  const reps = workout.exercises.find(exercise => exercise.tracking === 'reps');
  const seconds = workout.exercises.find(exercise => exercise.tracking === 'seconds');
  for (const exercise of [reps, seconds]) {
    const key = exercise.tracking === 'reps' ? 'actualReps' : 'actualSeconds';
    const values = Array(exercise.sets).fill(0);
    const response = await fetch(`${baseUrl}/api/fitness/today/exercises/${exercise.key}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ completed: true, [key]: values, weightKg: 0 })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(storedLog.exerciseLogs[exercise.key][key], values);
    assert.equal(storedLog.exerciseLogs[exercise.key].completed, true);
    assert.equal(storedLog.exerciseLogs[exercise.key].weightKg, 0);
  }
  helpers.getTodayString = () => '2026-09-01';
  storedLog = null;
  const response = await fetch(`${baseUrl}/api/fitness/today/exercises/brisk_walk`, {
    method: 'PATCH', headers: authHeaders(),
    body: JSON.stringify({ completed: true, durationMinutes: 0 })
  });
  assert.equal(response.status, 200);
  assert.equal(storedLog.exerciseLogs.brisk_walk.durationMinutes, 0);
});

test('actual arrays reject absent, blank and coerced entries instead of fabricating zero', async () => {
  const workout = getWorkoutForDate(userGender, helpers.getTodayString());
  for (const exercise of workout.exercises.filter(item => ['reps', 'seconds'].includes(item.tracking))) {
    const key = exercise.tracking === 'reps' ? 'actualReps' : 'actualSeconds';
    for (const invalid of [null, '', ' ', true, false, [], {}, -1, 1.5]) {
      const values = Array(exercise.sets).fill(10);
      values[0] = invalid;
      const response = await fetch(`${baseUrl}/api/fitness/today/exercises/${exercise.key}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ completed: true, [key]: values })
      });
      assert.equal(response.status, 400, `${key} rejects ${JSON.stringify(invalid)}`);
    }
  }
  assert.equal(storedLog, null);
  assert.equal(events.length, 0);
});

test('actual minutes and optional weight reject non-numeric coercion', async () => {
  helpers.getTodayString = () => '2026-09-01';
  for (const invalid of [undefined, null, '', ' ', true, false, [], {}, -1, 1.5]) {
    const response = await fetch(`${baseUrl}/api/fitness/today/exercises/brisk_walk`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ completed: true, durationMinutes: invalid })
    });
    assert.equal(response.status, 400, `minutes reject ${JSON.stringify(invalid)}`);
  }
  for (const invalid of [true, false, [], {}, ' ', -1, 501]) {
    const response = await fetch(`${baseUrl}/api/fitness/today/exercises/brisk_walk`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ completed: true, durationMinutes: 30, weightKg: invalid })
    });
    assert.equal(response.status, 400, `weight rejects ${JSON.stringify(invalid)}`);
  }
  assert.equal(storedLog, null);
  assert.equal(events.length, 0);
});
