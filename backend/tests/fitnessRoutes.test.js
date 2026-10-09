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
  getWorkout,
  getSequence,
  LEGACY_PLAN_VERSION,
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
let originalFitnessFindOne;
let readFixtures;
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


function sessionContext() { return { date: helpers.getTodayString(), workoutKey: storedLog?.workoutKey || 'A', planVersion: PLAN_VERSION }; }
async function mutateSession(action, extra = {}) {
  return fetch(`${baseUrl}/api/fitness/today/session`, {method:'PATCH',headers:authHeaders(),body:JSON.stringify({...sessionContext(),action,...extra})});
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
  readFixtures = logs;
  FitnessDailyLog.find = () => chainLean(logs);
  FitnessDailyLog.findOne = (query) => chainLean([...(storedLog ? [storedLog] : []), ...readFixtures].filter(log => matchesQuery(log, query)).sort((a,b) => b.date.localeCompare(a.date))[0] || null);
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
      if (!Object.keys(expected).length) return actual && !Object.keys(actual).length;
      return Object.entries(expected).every(([operator, operand]) => {
        if (operator === '$in') return operand.includes(actual);
        if (operator === '$lte') return actual <= operand;
        if (operator === '$lt') return actual < operand;
        if (operator === '$gt') return actual > operand;
        if (operator === '$elemMatch') return Array.isArray(actual) && actual.some(value => value > operand.$gt);
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
  FitnessDailyLog.findOneAndUpdate = async (filter, update, options = {}) => {
    mutationUpdates.push(update);
    if (storedLog && !matchesQuery(storedLog, filter)) return null;
    if (!storedLog && !options.upsert) return null;
    if (!storedLog) {
      storedLog = {
        _id: '333333333333333333333333',
        coupleId: filter.coupleId,
        userId: filter.userId,
        date: filter.date,
        planVersion: update.$setOnInsert?.planVersion,
        workoutKey: update.$setOnInsert?.workoutKey,
        exerciseLogs: {},
        mealLogs: {},
        workoutCompletedAt: null,
        updatedAt: new Date()
      };
    }
    if (Array.isArray(update)) {
      const now = new Date();
      const evaluate = value => {
        if (value === '$$NOW') return now;
        if (typeof value === 'string' && value.startsWith('$')) return value.slice(1).split('.').reduce((obj,key) => obj?.[key],storedLog);
        if (!value || typeof value !== 'object') return value;
        if ('$cond' in value) return evaluate(value.$cond[evaluate(value.$cond[0]) ? 1 : 2]);
        if ('$ifNull' in value) return evaluate(value.$ifNull[0]) ?? evaluate(value.$ifNull[1]);
        if ('$and' in value) return value.$and.every(evaluate);
        if ('$eq' in value) return evaluate(value.$eq[0]) === evaluate(value.$eq[1]);
        throw new Error('Unsupported pipeline expression');
      };
      for (const stage of update) {
        const next = Object.fromEntries(Object.entries(stage.$set).map(([key,value]) => [key,evaluate(value)]));
        Object.assign(storedLog,next);
      }
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
  originalFitnessFindOne = FitnessDailyLog.findOne;
  originalFitnessAggregate = FitnessDailyLog.aggregate;
  originalFitnessFindOneAndUpdate = FitnessDailyLog.findOneAndUpdate;
  originalGetTodayString = helpers.getTodayString;
});

test.after(async () => {
  User.findById = originalUserFindById;
  HealthRecord.find = originalHealthFind;
  FitnessDailyLog.find = originalFitnessFind;
  FitnessDailyLog.findOne = originalFitnessFindOne;
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

test('fitness plan is a date-independent sequence with the requested female exclusions', async () => {
  const response = await fetch(`${baseUrl}/api/fitness`, { headers: authHeaders() });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.mine.today.workout.key, 'A');
  assert.deepEqual(body.data.mine.sequence.map(item => item.key), ['A','B','C','D','E']);
  assert.doesNotMatch(JSON.stringify(getSequence('female').flatMap(w => w.exercises)), /深蹲|腿举|保加利亚|臀推机|提踵/);
  assert.equal(body.data.mine.week, undefined);
  assert.equal(body.data.mine.progress.plannedWorkouts, undefined);
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
  const exercise = getWorkout(userGender, 'A').exercises[0];
  const payload = { completed: true, userId: partnerId, weightKg: 12 };
  if (exercise.tracking === 'reps') payload.actualReps = Array(exercise.sets).fill(exercise.reps);
  if (exercise.tracking === 'seconds') payload.actualSeconds = Array(exercise.sets).fill(exercise.seconds);
  if (exercise.tracking === 'minutes') payload.durationMinutes = exercise.minutes;

  const response = await fetch(`${baseUrl}/api/fitness/today/exercises/${exercise.key}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ ...sessionContext(), ...payload })
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
    Object.keys(upsert.$setOnInsert).filter(key => Object.hasOwn(upsert.$set || {}, key)),
    []
  );
});

test('exercise mutation requires one real entry for every fixed set', async () => {
  const today = helpers.getTodayString();
  const exercise = getWorkout(userGender, 'A').exercises.find(item => item.tracking === 'reps');

  const response = await fetch(`${baseUrl}/api/fitness/today/exercises/${exercise.key}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ ...sessionContext(), completed: true, actualReps: [exercise.reps] })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.message, /完整记录/);
  assert.equal(storedLog, null);
  assert.equal(events.length, 0);
});

test('workout completion is derived atomically after every planned exercise is recorded', async () => {
  const today = helpers.getTodayString();
  const workout = getWorkout(userGender, 'A');

  for (const exercise of workout.exercises) {
    const payload = { completed: true };
    if (exercise.tracking === 'reps') payload.actualReps = Array(exercise.sets).fill(exercise.reps);
    if (exercise.tracking === 'seconds') payload.actualSeconds = Array(exercise.sets).fill(exercise.seconds);
    if (exercise.tracking === 'minutes') payload.durationMinutes = exercise.minutes;
    const response = await fetch(`${baseUrl}/api/fitness/today/exercises/${exercise.key}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ ...sessionContext(), ...payload })
    });
    assert.equal(response.status, 200);
  }

  assert.ok(storedLog.workoutCompletedAt);
  assert.equal(storedLog.sessionFinishedAt, storedLog.workoutCompletedAt);
  const {data} = await (await fetch(`${baseUrl}/api/fitness`,{headers:authHeaders()})).json();
  assert.equal(data.mine.today.canEdit,false);
  assert.ok(data.mine.today.log.sessionFinishedAt);
  assert.equal(data.mine.today.nextWorkout.key,'B');
  const locked = await fetch(`${baseUrl}/api/fitness/today/exercises/${workout.exercises[0].key}`, {
    method:'PATCH', headers:authHeaders(), body:JSON.stringify({...sessionContext(),completed:false})
  });
  assert.equal(locked.status,409);
  assert.equal(mutationUpdates.filter(Array.isArray).length, workout.exercises.length);
  assert.equal(events.at(-1).message.data.payload.workoutCompleted, true);
});

test('retired meal writes cannot overwrite the new training session', async () => {
  const response = await fetch(`${baseUrl}/api/fitness/today/meals/lunch`, {
    method: 'PATCH', headers: authHeaders(), body: JSON.stringify({status:'on_plan'})
  });
  assert.equal(response.status, 410);
  assert.equal(storedLog, null);
  assert.equal(events.length, 0);
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
    makeLog('2026-09-04', 'leg_extension_c', 25, { planVersion: LEGACY_PLAN_VERSION, workoutKey: 'supported_c' }),
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
  assert.equal(history.exercise.label, '腿屈伸');
  const previous = body.data.mine.today.previousExercises.leg_extension_c;
  assert.equal(previous.date, '2026-07-06');
  assert.equal(previous.weightKg, 20);
  assert.deepEqual(previous.actualReps, [12, 11, 0]);
  assert.equal(body.data.mine.today.previousExercises.leg_curl_c, null);
  assert.deepEqual(body.data.partner.exerciseHistory, []);
  assert.deepEqual(Object.keys(previous).sort(), [
    'actualReps', 'actualRepsRight', 'actualSeconds', 'completed', 'completedAt', 'date', 'durationMinutes', 'weightKg'
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
  assert.equal(data.mine.today.previousExercises.seated_row.weightKg, 16);
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
  const workout = getWorkout(userGender, storedLog?.workoutKey || 'A');
  const reps = workout.exercises.find(exercise => exercise.tracking === 'reps');

  for (const exercise of [reps]) {
    const key = exercise.tracking === 'reps' ? 'actualReps' : 'actualSeconds';
    const values = Array(exercise.sets).fill(0);
    const response = await fetch(`${baseUrl}/api/fitness/today/exercises/${exercise.key}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ ...sessionContext(), completed: true, [key]: values, weightKg: 0 })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(storedLog.exerciseLogs[exercise.key][key], values);
    assert.equal(storedLog.exerciseLogs[exercise.key].completed, true);
    assert.equal(storedLog.exerciseLogs[exercise.key].weightKg, 0);
  }
  helpers.getTodayString = () => '2026-09-01';
  storedLog = null;
  const response = await fetch(`${baseUrl}/api/fitness/today/exercises/cardio_finish`, {
    method: 'PATCH', headers: authHeaders(),
    body: JSON.stringify({ ...sessionContext(), completed: true, durationMinutes: 0 })
  });
  assert.equal(response.status, 200);
  assert.equal(storedLog.exerciseLogs.cardio_finish.durationMinutes, 0);
});

test('actual arrays reject absent, blank and coerced entries instead of fabricating zero', async () => {
  const workout = getWorkout(userGender, storedLog?.workoutKey || 'A');
  for (const exercise of workout.exercises.filter(item => ['reps', 'seconds'].includes(item.tracking))) {
    const key = exercise.tracking === 'reps' ? 'actualReps' : 'actualSeconds';
    for (const invalid of [null, '', ' ', true, false, [], {}, -1, 1.5]) {
      const values = Array(exercise.sets).fill(10);
      values[0] = invalid;
      const response = await fetch(`${baseUrl}/api/fitness/today/exercises/${exercise.key}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ ...sessionContext(), completed: true, [key]: values })
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
    const response = await fetch(`${baseUrl}/api/fitness/today/exercises/cardio_finish`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ ...sessionContext(), completed: true, durationMinutes: invalid })
    });
    assert.equal(response.status, 400, `minutes reject ${JSON.stringify(invalid)}`);
  }
  for (const invalid of [true, false, [], {}, ' ', -1, 501]) {
    const response = await fetch(`${baseUrl}/api/fitness/today/exercises/cardio_finish`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ ...sessionContext(), completed: true, durationMinutes: 30, weightKg: invalid })
    });
    assert.equal(response.status, 400, `weight rejects ${JSON.stringify(invalid)}`);
  }
  assert.equal(storedLog, null);
  assert.equal(events.length, 0);
});

function sessionLog(key, date, finished = false, extra = {}) {
  return { _id: '333333333333333333333333', coupleId, userId, date, planVersion: PLAN_VERSION,
    workoutKey:key, sessionFinishedAt:finished ? new Date() : null, exerciseLogs:{}, ...extra };
}
test('weeks of busy days do not skip the unfinished session and owners progress separately', async () => {
  helpers.getTodayString = () => '2026-12-01';
  setReadFixtures([sessionLog('B','2026-09-01',true), sessionLog('rest','2026-11-30'), sessionLog('D','2026-11-29',true,{userId:partnerId})]);
  const {data} = await (await fetch(`${baseUrl}/api/fitness`,{headers:authHeaders()})).json();
  assert.equal(data.mine.today.workout.key,'C');
  assert.equal(data.partner.today.workout.key,'E');
  assert.equal(data.mine.progress.recordedDays,0);
});
test('historical fully recorded sessions advance without an explicit finish', async () => {
  setReadFixtures([sessionLog('B','2026-09-01',false,{workoutCompletedAt:new Date()})]);
  const {data} = await (await fetch(`${baseUrl}/api/fitness`,{headers:authHeaders()})).json();
  assert.equal(data.mine.today.workout.key,'C');
});
test('rest preserves sequence; resuming is allowed before recording', async () => {
  assert.equal((await mutateSession('rest')).status,200);
  assert.equal(storedLog.workoutKey,'rest');
  assert.equal((await mutateSession('resume')).status,200);
  assert.equal(storedLog.workoutKey,'A');
  assert.equal(events.length,2);
});
test('finished E requires a rest day then returns to A without missed-day debt', async () => {
  setReadFixtures([sessionLog('E','2026-09-01',true)]);
  const {data} = await (await fetch(`${baseUrl}/api/fitness`,{headers:authHeaders()})).json();
  assert.equal(data.mine.today.workout.key,'rest');
  assert.equal(data.mine.today.nextWorkout.key,'A');
  assert.equal((await mutateSession('resume',{workoutKey:'rest'})).status,409);
  helpers.getTodayString = () => '2026-09-05';
  const later = await (await fetch(`${baseUrl}/api/fitness`,{headers:authHeaders()})).json();
  assert.equal(later.data.mine.today.workout.key,'A');
});
test('stale exercise requests cannot overwrite rest or a different day', async () => {
  await mutateSession('rest');
  for(const context of [{workoutKey:'A'},{date:'2026-09-01'}]) {
    const response = await fetch(`${baseUrl}/api/fitness/today/exercises/lat_pulldown`,{method:'PATCH',headers:authHeaders(),body:JSON.stringify({...sessionContext(),...context,completed:true,actualReps:[10,10,10]})});
    assert.equal(response.status,409);
  }
  assert.equal(storedLog.workoutKey,'rest');
  assert.deepEqual(storedLog.exerciseLogs,{});
});
test('partial positive records can finish once; zero-only cannot and finished logs are locked', async () => {
  storedLog=sessionLog('A',helpers.getTodayString(),false,{exerciseLogs:{lat_pulldown:{completed:true,actualReps:[0,0,0]}}});
  assert.equal((await mutateSession('finish')).status,409);
  storedLog.exerciseLogs.lat_pulldown.actualReps=[10,0,0];
  assert.equal((await mutateSession('rest')).status,409);
  assert.equal((await mutateSession('finish')).status,200);
  assert.ok(storedLog.sessionFinishedAt);
  assert.equal((await mutateSession('finish')).status,200);
  const response=await fetch(`${baseUrl}/api/fitness/today/exercises/lat_pulldown`,{method:'PATCH',headers:authHeaders(),body:JSON.stringify({...sessionContext(),completed:false})});
  assert.equal(response.status,409);
});
test('unilateral movements require both sides without fabricating the missing side', async () => {
  storedLog=sessionLog('C',helpers.getTodayString());
  for(const right of [undefined,[10],[10,null]]) {
    const response=await fetch(`${baseUrl}/api/fitness/today/exercises/dead_bug`,{method:'PATCH',headers:authHeaders(),body:JSON.stringify({...sessionContext(),completed:true,actualReps:[10,10],actualRepsRight:right})});
    assert.equal(response.status,400);
  }
  const response=await fetch(`${baseUrl}/api/fitness/today/exercises/dead_bug`,{method:'PATCH',headers:authHeaders(),body:JSON.stringify({...sessionContext(),completed:true,actualReps:[10,10],actualRepsRight:[10,0]})});
  assert.equal(response.status,200);
  assert.deepEqual(storedLog.exerciseLogs.dead_bug.actualRepsRight,[10,0]);
});
test('persistence failure emits no partner update', async () => {
  FitnessDailyLog.findOneAndUpdate=async()=>{throw new Error('synthetic database unavailable');};
  const response=await mutateSession('rest');
  assert.equal(response.status,500);
  assert.equal(events.length,0);
});

test('a concurrent rest claim wins without exercise overwrite or false broadcast', async () => {
  const update=FitnessDailyLog.findOneAndUpdate;
  FitnessDailyLog.findOneAndUpdate=async(filter,mutation,options)=>{
    if(options?.upsert) storedLog=sessionLog('rest',helpers.getTodayString());
    return update(filter,mutation,options);
  };
  const response=await fetch(`${baseUrl}/api/fitness/today/exercises/lat_pulldown`,{method:'PATCH',headers:authHeaders(),body:JSON.stringify({...sessionContext(),completed:true,actualReps:[10,10,10]})});
  assert.equal(response.status,409);
  assert.equal(storedLog.workoutKey,'rest');
  assert.deepEqual(storedLog.exerciseLogs,{});
  assert.equal(events.length,0);
});
test('a concurrent record blocks rest without losing actual data', async () => {
  const update=FitnessDailyLog.findOneAndUpdate;
  FitnessDailyLog.findOneAndUpdate=async(filter,mutation,options)=>{
    if(filter.exerciseLogs) storedLog.exerciseLogs.lat_pulldown={completed:true,actualReps:[10,10,10]};
    return update(filter,mutation,options);
  };
  assert.equal((await mutateSession('rest')).status,409);
  assert.deepEqual(storedLog.exerciseLogs.lat_pulldown.actualReps,[10,10,10]);
  assert.equal(storedLog.workoutKey,'A');
  assert.equal(events.length,0);
});
test('legacy same-day writes preserve the old plan version and exact old targets', async () => {
  storedLog=sessionLog('supported_b',helpers.getTodayString(),false,{planVersion:LEGACY_PLAN_VERSION});
  const response=await fetch(`${baseUrl}/api/fitness/today/exercises/glute_bridge_b`,{method:'PATCH',headers:authHeaders(),body:JSON.stringify({...sessionContext(),planVersion:LEGACY_PLAN_VERSION,completed:true,actualReps:[12,11,10]})});
  assert.equal(response.status,200);
  assert.equal(storedLog.planVersion,LEGACY_PLAN_VERSION);
  assert.deepEqual(storedLog.exerciseLogs.glute_bridge_b.actualReps,[12,11,10]);
});

test('historical completion today is shown finished and cannot be edited', async () => {
  const completedAt = new Date('2026-09-02T04:00:00Z');
  storedLog=sessionLog('A',helpers.getTodayString(),false,{workoutCompletedAt:completedAt});
  const {data}=await (await fetch(baseUrl+'/api/fitness',{headers:authHeaders()})).json();
  assert.equal(data.mine.today.log.sessionFinishedAt,completedAt.toISOString());
  assert.equal(data.mine.today.canEdit,false);
  assert.equal(data.mine.today.nextWorkout.key,'B');
  const response=await fetch(baseUrl+'/api/fitness/today/exercises/lat_pulldown',{method:'PATCH',headers:authHeaders(),body:JSON.stringify({...sessionContext(),completed:false})});
  assert.equal(response.status,409);
  assert.equal((await mutateSession('finish')).status,200);
});
