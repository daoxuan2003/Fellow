const express = require('express');

const authMiddleware = require('../middleware/auth');
const { User, HealthRecord, FitnessDailyLog } = require('../models');
const helpers = require('../utils/helpers');
const { logError } = require('../utils/safeLogger');
const {
  PLAN_VERSION,
  LEGACY_PLAN_VERSION,
  getSequence,
  getWorkout,
  resolveSession,
  MEAL_SLOTS,
  getFitnessProfile,
  findExercise,
  getExerciseHistoryDefinitions,
  offsetDateOnly,
  startOfWeek
} = require('../services/fitnessPlan');

const router = express.Router();
const EXERCISE_HISTORY_LIMIT = 12;

function getCoupleId(userId, partnerId) {
  return [String(userId), String(partnerId)].sort().join('_');
}

async function findUserProfile(userId) {
  return User.findById(userId)
    .select('_id nickname avatar gender partnerId')
    .lean();
}

async function resolveCouple(req, res) {
  const userId = String(req.userId || '');
  const user = await findUserProfile(userId);
  if (!user?.partnerId) {
    res.status(400).json({ success: false, message: '请先绑定伴侣' });
    return null;
  }

  const partnerId = String(user.partnerId);
  const partner = await findUserProfile(partnerId);
  if (!partner || String(partner.partnerId || '') !== userId) {
    res.status(409).json({ success: false, message: '情侣关系状态需要重新同步' });
    return null;
  }

  return {
    userId,
    partnerId,
    coupleId: getCoupleId(userId, partnerId),
    user,
    partner
  };
}

function mapToObject(value) {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value.entries());
  if (typeof value === 'object') return { ...value };
  return {};
}

function serializeExerciseLog(value) {
  if (!value) return null;
  const source = value?.toObject ? value.toObject() : value;
  const hasDuration = source.durationMinutes !== null && source.durationMinutes !== undefined && source.durationMinutes !== '';
  const hasWeight = source.weightKg !== null && source.weightKg !== undefined && source.weightKg !== '';
  return {
    completed: Boolean(source.completed),
    actualReps: Array.isArray(source.actualReps) ? source.actualReps.map(Number) : [],
    actualRepsRight: Array.isArray(source.actualRepsRight) ? source.actualRepsRight.map(Number) : [],
    actualSeconds: Array.isArray(source.actualSeconds) ? source.actualSeconds.map(Number) : [],
    durationMinutes: hasDuration && Number.isFinite(Number(source.durationMinutes)) ? Number(source.durationMinutes) : null,
    weightKg: hasWeight && Number.isFinite(Number(source.weightKg)) ? Number(source.weightKg) : null,
    completedAt: source.completedAt || null
  };
}

function serializeMealLog(value) {
  if (!value) return null;
  const source = value?.toObject ? value.toObject() : value;
  return {
    status: source.status,
    note: String(source.note || ''),
    recordedAt: source.recordedAt || null
  };
}

function serializeLog(log) {
  if (!log) return null;
  const source = log?.toObject ? log.toObject() : log;
  const exerciseLogs = Object.fromEntries(
    Object.entries(mapToObject(source.exerciseLogs))
      .map(([key, value]) => [key, serializeExerciseLog(value)])
  );
  const mealLogs = Object.fromEntries(
    Object.entries(mapToObject(source.mealLogs))
      .map(([key, value]) => [key, serializeMealLog(value)])
  );
  return {
    date: String(source.date || ''),
    workoutKey: String(source.workoutKey || ''),
    sessionFinishedAt: source.sessionFinishedAt || null,
    exerciseLogs,
    mealLogs,
    workoutCompletedAt: source.workoutCompletedAt || null,
    updatedAt: source.updatedAt || null
  };
}

function compactUser(user, isMine) {
  return {
    id: String(user._id),
    nickname: String(user.nickname || (isMine ? '我' : '伴侣')),
    avatar: String(user.avatar || ''),
    gender: user.gender === 'male' || user.gender === 'female' ? user.gender : null,
    isMine
  };
}

function latestHealthFor(records, userId) {
  const record = records.find(item => String(item.userId) === String(userId));
  if (!record) return null;
  const numericOrNull = value => (
    value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
      ? Number(value)
      : null
  );
  return {
    recordedAt: helpers.formatDate(record.recordedAt),
    weight: numericOrNull(record.weight),
    bodyFat: numericOrNull(record.bodyFat),
    waist: numericOrNull(record.measurements?.waist)
  };
}

async function readSession(context, user, today) {
  const filter = { coupleId: context.coupleId, userId: String(user._id) };
  const [todayLog, latestSession] = await Promise.all([
    FitnessDailyLog.findOne({ ...filter, date: today }).lean(),
    FitnessDailyLog.findOne({ ...filter, date: { $lt: today }, planVersion: PLAN_VERSION,
      workoutKey: { $in: ['A', 'B', 'C', 'D', 'E'] }
    }).sort({ date: -1 }).lean()
  ]);
  return { ...resolveSession(user.gender, today, todayLog, latestSession), todayLog, latestSession };
}

function buildProgress(today, logs) {
  const since = offsetDateOnly(today, -27);
  const recent = logs.filter(log => String(log.date) >= since && String(log.date) <= today);
  return {
    days: 28,
    completedWorkouts: recent.filter(log => log.sessionFinishedAt || log.workoutCompletedAt).length,
    recordedDays: recent.filter(log => Object.values(mapToObject(log.exerciseLogs)).some(item => item.completed)).length
  };
}

function buildParticipant(user, isMine, today, logs, healthRecords, histories, session) {
  const userId = String(user._id);
  const userLogs = logs.filter(log => String(log.userId) === userId);
  const todayWorkout = session.workout;
  const todayLog = session.todayLog;
  const history = histories.get(userId) || [];
  const previousExercises = Object.fromEntries(todayWorkout.exercises.map(exercise => {
    const matchingHistory = history.find(item => item.exerciseKeys.includes(exercise.key));
    const previous = matchingHistory?.records.find(record => record.date < today) || null;
    return [exercise.key, previous];
  }));
  return {
    user: compactUser(user, isMine),
    profile: getFitnessProfile(user.gender),
    today: {
      date: today,
      workout: todayWorkout,
      log: serializeLog(todayLog),
      previousExercises,
      canEdit: isMine && !todayLog?.sessionFinishedAt,
      canManage: isMine,
      legacy: session.legacy,
      recoveryDue: session.recoveryDue || false,
      nextWorkout: getWorkout(user.gender, session.nextKey)
    },
    exerciseHistory: history
      .filter(item => item.records.length)
      .map(({ key, exercise, records }) => ({
        key,
        exercise,
        records: records.slice(0, EXERCISE_HISTORY_LIMIT)
      })),
    sequence: getSequence(user.gender),
    progress: buildProgress(today, userLogs),
    health: latestHealthFor(healthRecords, userId)
  };
}

function isValidRecordedExercise(log, exercise) {
  if (log?.completed !== true) return false;
  const validNumber = (value, max) => typeof value === 'number'
    && Number.isInteger(value) && value >= 0 && value <= max;
  if (log.weightKg != null && (
    typeof log.weightKg !== 'number' || !Number.isFinite(log.weightKg)
    || log.weightKg < 0 || log.weightKg > 500
  )) return false;
  if (exercise.tracking === 'minutes') return validNumber(log.durationMinutes, 240);
  const values = exercise.tracking === 'seconds' ? log.actualSeconds : log.actualReps;
  const max = exercise.tracking === 'seconds' ? 3600 : 200;
  return Array.isArray(values) && values.length > 0 && values.length <= 20
    && values.every(value => validNumber(value, max));
}

async function readExerciseHistories(context, today) {
  const participants = [context.user, context.partner].map(user => ({
    userId: String(user._id),
    definitions: getExerciseHistoryDefinitions(user.gender)
  }));
  const facets = {};
  participants.forEach((participant, participantIndex) => {
    participant.definitions.forEach((definition, exerciseIndex) => {
      facets[`p${participantIndex}_e${exerciseIndex}`] = [
        { $match: { userId: participant.userId, 'exerciseLogs.k': { $in: definition.exerciseKeys } } },
        { $sort: { date: -1 } },
        { $limit: EXERCISE_HISTORY_LIMIT + 1 },
        { $project: {
          _id: 0,
          date: 1,
          completed: '$exerciseLogs.v.completed',
          actualReps: '$exerciseLogs.v.actualReps',
          actualSeconds: '$exerciseLogs.v.actualSeconds',
          actualRepsRight: '$exerciseLogs.v.actualRepsRight',
          durationMinutes: '$exerciseLogs.v.durationMinutes',
          weightKg: '$exerciseLogs.v.weightKg',
          completedAt: '$exerciseLogs.v.completedAt'
        } }
      ];
    });
  });
  const [result = {}] = await FitnessDailyLog.aggregate([
    { $match: {
      coupleId: context.coupleId,
      userId: { $in: participants.map(participant => participant.userId) },
      date: { $lte: today },
      // Retain known legacy records without reinterpreting their set counts.
      $or: [{ planVersion: PLAN_VERSION }, { planVersion: LEGACY_PLAN_VERSION }, { planVersion: null }]
    } },
    { $project: {
      _id: 0,
      userId: 1,
      date: 1,
      exerciseLogs: { $objectToArray: { $ifNull: ['$exerciseLogs', {}] } }
    } },
    { $unwind: '$exerciseLogs' },
    { $match: { 'exerciseLogs.v.completed': true } },
    { $facet: facets }
  ], { maxTimeMS: 5000 });
  return new Map(participants.map((participant, participantIndex) => [
    participant.userId,
    participant.definitions.map((definition, exerciseIndex) => ({
      ...definition,
      records: (result[`p${participantIndex}_e${exerciseIndex}`] || [])
        .filter(log => isValidRecordedExercise(log, definition.exercise))
        .map(log => ({ date: String(log.date), ...serializeExerciseLog(log) }))
    }))
  ]));
}

function emitFitnessSync(req, coupleId, action, payload) {
  const broadcastToCouple = req.app.locals.broadcastToCouple;
  if (!broadcastToCouple) return;
  broadcastToCouple(coupleId, {
    type: 'fitnessSync',
    data: {
      action,
      payload,
      actor: String(req.userId),
      timestamp: Date.now()
    }
  });
}

function normalizeWeight(value) {
  if (value === undefined || value === null || value === '') return { value: null };
  if (!isNumericInput(value)) return { error: '训练重量需要在0到500kg之间' };
  const weight = Number(value);
  if (!Number.isFinite(weight) || weight < 0 || weight > 500) {
    return { error: '训练重量需要在0到500kg之间' };
  }
  return { value: Math.round(weight * 10) / 10 };
}

function isNumericInput(value) {
  return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
}

function normalizeActualArray(value, expectedLength, max, label) {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    return { error: `${label}需要完整记录${expectedLength}组` };
  }
  const numbers = value.map(Number);
  if (value.some(item => !isNumericInput(item))
    || numbers.some(number => !Number.isInteger(number) || number < 0 || number > max)) {
    return { error: `${label}记录不正确` };
  }
  return { value: numbers };
}

function normalizeExercisePayload(body, exercise) {
  if (typeof body?.completed !== 'boolean') return { error: '完成状态无效' };
  const weight = normalizeWeight(body.weightKg);
  if (weight.error) return weight;
  const value = {
    completed: body.completed,
    actualReps: [],
    actualRepsRight: [],
    actualSeconds: [],
    durationMinutes: null,
    weightKg: weight.value,
    completedAt: body.completed ? new Date() : null
  };

  if (!body.completed) return { value };
  if (exercise.tracking === 'reps') {
    const reps = normalizeActualArray(body.actualReps, exercise.sets, 200, '实际次数');
    if (reps.error) return reps;
    value.actualReps = reps.value;
    if (exercise.perSide) {
      const right = normalizeActualArray(body.actualRepsRight, exercise.sets, 200, '右侧实际次数');
      if (right.error) return right;
      value.actualRepsRight = right.value;
    }
  } else if (exercise.tracking === 'seconds') {
    const seconds = normalizeActualArray(body.actualSeconds, exercise.sets, 3600, '实际秒数');
    if (seconds.error) return seconds;
    value.actualSeconds = seconds.value;
  } else if (exercise.tracking === 'minutes') {
    const minutes = Number(body.durationMinutes);
    if (!isNumericInput(body.durationMinutes) || !Number.isInteger(minutes) || minutes < 0 || minutes > 240) {
      return { error: '实际分钟数记录不正确' };
    }
    value.durationMinutes = minutes;
  }
  return { value };
}

// Claim today's plan once. A concurrent rest/start/record cannot replace it.
async function ensureDailyLog(filter, workout) {
  try {
    return await FitnessDailyLog.findOneAndUpdate(filter, {
      $setOnInsert: { ...filter, planVersion: PLAN_VERSION, workoutKey: workout.key, exerciseLogs: {}, mealLogs: {} }
    }, { new: true, upsert: true, runValidators: true });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return FitnessDailyLog.findOne(filter).lean();
  }
}
function requestMatchesSession(body, session, today) {
  return body?.date === today && body?.workoutKey === session.workout.key
    && body?.planVersion === (session.legacy ? session.todayLog.planVersion || LEGACY_PLAN_VERSION : PLAN_VERSION);
}
function staleSession(res) {
  return res.status(409).json({ success: false, message: '训练状态已变化，请刷新后再记录；输入仍为你保留。' });
}

async function syncWorkoutCompletion(log, workout) {
  if (!log) return null;
  const completionChecks = workout.exercises.map(
    exercise => ({ $eq: [`$exerciseLogs.${exercise.key}.completed`, true] })
  );
  return FitnessDailyLog.findOneAndUpdate(
    { _id: log._id, workoutKey: workout.key },
    [{
      $set: {
        workoutCompletedAt: {
          $cond: [
            completionChecks.length ? { $and: completionChecks } : false,
            { $ifNull: ['$workoutCompletedAt', '$$NOW'] },
            null
          ]
        }
      }
    }],
    { new: true }
  );
}

router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const context = await resolveCouple(req, res);
    if (!context) return;
    const today = helpers.getTodayString();
    const [mineSession, partnerSession] = await Promise.all([
      readSession(context, context.user, today), readSession(context, context.partner, today)
    ]);
    const mine = mineSession.todayLog;
    const partner = partnerSession.todayLog;
    const workout = mineSession.workout;
    res.json({
      success: true,
      data: {
        date: today,
        workoutLabel: workout.label,
        durationMinutes: workout.durationMinutes,
        completed: Boolean(mine?.sessionFinishedAt || mine?.workoutCompletedAt),
        partnerCompleted: Boolean(partner?.sessionFinishedAt || partner?.workoutCompletedAt)
      }
    });
  } catch (error) {
    logError('获取健身摘要失败:', error);
    res.status(500).json({ success: false, message: '健身摘要暂时没有同步好' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const context = await resolveCouple(req, res);
    if (!context) return;
    const today = helpers.getTodayString();
    const since = offsetDateOnly(today, -41);
    const [logs, healthRecords, histories, mineSession, partnerSession] = await Promise.all([
      FitnessDailyLog.find({
        coupleId: context.coupleId,
        date: { $gte: since, $lte: today }
      }).sort({ date: -1 }).lean(),
      HealthRecord.find({ coupleId: context.coupleId })
        .sort({ recordedAt: -1, updatedAt: -1, createdAt: -1 })
        .lean(),
      readExerciseHistories(context, today),
      readSession(context, context.user, today),
      readSession(context, context.partner, today)
    ]);

    res.json({
      success: true,
      data: {
        planVersion: PLAN_VERSION,
        today,
        weekStart: startOfWeek(today),
        mealSlots: MEAL_SLOTS,
        mine: buildParticipant(context.user, true, today, logs, healthRecords, histories, mineSession),
        partner: buildParticipant(context.partner, false, today, logs, healthRecords, histories, partnerSession)
      }
    });
  } catch (error) {
    logError('获取双人健身计划失败:', error);
    res.status(500).json({ success: false, message: '训练计划暂时没有同步好，请重试' });
  }
});

router.patch('/today/exercises/:exerciseKey', authMiddleware, async (req, res) => {
  try {
    const context = await resolveCouple(req, res);
    if (!context) return;
    const today = helpers.getTodayString();
    const session = await readSession(context, context.user, today);
    if (!requestMatchesSession(req.body, session, today) || session.todayLog?.sessionFinishedAt) return staleSession(res);
    const workout = session.workout;
    const exercise = findExercise(workout, req.params.exerciseKey);
    if (!exercise || workout.type === 'rest') {
      return res.status(404).json({ success: false, message: '今天没有这个训练动作' });
    }
    const normalized = normalizeExercisePayload(req.body, exercise);
    if (normalized.error) {
      return res.status(400).json({ success: false, message: normalized.error });
    }

    const filter = { coupleId: context.coupleId, userId: context.userId, date: today };
    const claimed = session.todayLog || await ensureDailyLog(filter, workout);
    if (!claimed || claimed.workoutKey !== workout.key || claimed.sessionFinishedAt) return staleSession(res);
    let log = await FitnessDailyLog.findOneAndUpdate(
      { ...filter, workoutKey: workout.key, planVersion: claimed.planVersion, sessionFinishedAt: null },
      { $set: { [`exerciseLogs.${exercise.key}`]: normalized.value } },
      { new: true, runValidators: true }
    );
    if (!log) return staleSession(res);
    log = await syncWorkoutCompletion(log, workout);
    emitFitnessSync(req, context.coupleId, 'exerciseUpdate', {
      date: today,
      exerciseKey: exercise.key,
      completed: normalized.value.completed,
      workoutCompleted: Boolean(log?.workoutCompletedAt)
    });

    res.json({
      success: true,
      message: log?.workoutCompletedAt
        ? '今天的训练已全部记录'
        : (normalized.value.completed ? '这一项已经记下' : '这一项已恢复为待完成'),
      data: { log: serializeLog(log) }
    });
  } catch (error) {
    logError('更新健身动作失败:', error);
    res.status(500).json({ success: false, message: '训练记录没有保存，请稍后重试' });
  }
});

router.patch('/today/session', authMiddleware, async (req, res) => {
  try {
    const context = await resolveCouple(req, res);
    if (!context) return;
    const today = helpers.getTodayString();
    const session = await readSession(context, context.user, today);
    if (!requestMatchesSession(req.body, session, today)) return staleSession(res);
    const action = req.body.action;
    if (!['rest', 'resume', 'finish'].includes(action)) return res.status(400).json({ success: false, message: '训练操作无效' });
    if (session.legacy) return res.status(409).json({ success: false, message: '今天保留旧版记录，下次训练从新计划A开始。' });
    const filter = { coupleId: context.coupleId, userId: context.userId, date: today };
    const log = session.todayLog || await ensureDailyLog(filter, session.workout);
    if (!log || log.workoutKey !== session.workout.key) return staleSession(res);
    let saved;
    if (action === 'finish') {
      if (log.sessionFinishedAt) return res.json({ success: true, message: '本次已结束', data: { log: serializeLog(log) } });
      const positiveRecords = session.workout.exercises.flatMap(exercise => {
        const paths = exercise.tracking === 'minutes' ? ['durationMinutes'] : exercise.perSide ? ['actualReps', 'actualRepsRight'] : ['actualReps'];
        return paths.map(path => ({
          [`exerciseLogs.${exercise.key}.completed`]: true,
          [`exerciseLogs.${exercise.key}.${path}`]: path === 'durationMinutes' ? { $gt: 0 } : { $elemMatch: { $gt: 0 } }
        }));
      });
      if (!positiveRecords.length) return res.status(400).json({ success: false, message: '休息日不需要结束训练' });
      saved = await FitnessDailyLog.findOneAndUpdate({ ...filter, workoutKey: session.workout.key, sessionFinishedAt: null, $or: positiveRecords },
        { $set: { sessionFinishedAt: new Date() } }, { new: true, runValidators: true });
      if (!saved) return res.status(409).json({ success: false, message: '请先记录实际做过的训练，再结束本次。' });
    } else {
      if (action === 'resume' && (session.recoveryDue || !getSequence(context.user.gender).length)) {
        return res.status(409).json({ success: false, message: session.recoveryDue ? 'E结束后今天先休息，下一次从A开始。' : '请先设置个人资料中的性别。' });
      }
      const key = action === 'rest' ? 'rest' : session.nextKey;
      saved = await FitnessDailyLog.findOneAndUpdate({ ...filter, workoutKey: session.workout.key, sessionFinishedAt: null, exerciseLogs: {} },
        { $set: { workoutKey: key } }, { new: true, runValidators: true });
      if (!saved) return res.status(409).json({ success: false, message: '本次已有记录，先保留实际训练；下次仍会接着当前顺序。' });
    }
    emitFitnessSync(req, context.coupleId, 'sessionUpdate', { date: today, action });
    const updatedSession = resolveSession(context.user.gender, today, saved, session.latestSession);
    res.json({ success: true, message: action === 'finish' ? '本次已结束，下次接着练' : action === 'rest' ? '安心休息，训练顺序已保留' : '继续当前训练', data: { log: serializeLog(saved), today: { workout: updatedSession.workout, nextWorkout: getWorkout(context.user.gender, updatedSession.nextKey), canEdit: !saved.sessionFinishedAt } } });
  } catch (error) {
    logError('更新训练顺序失败:', error);
    res.status(500).json({ success: false, message: '训练状态没有保存，请稍后重试' });
  }
});

// Keep historical meals readable, but retired clients cannot overwrite the new plan.
router.patch('/today/meals/:slot', authMiddleware, (req, res) => {
  res.status(410).json({ success: false, message: '饮食计划已单独安排，请刷新至新版训练页面。' });
});

module.exports = router;
