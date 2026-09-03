const express = require('express');

const authMiddleware = require('../middleware/auth');
const { User, HealthRecord, FitnessDailyLog } = require('../models');
const helpers = require('../utils/helpers');
const { logError } = require('../utils/safeLogger');
const {
  PLAN_VERSION,
  MEAL_SLOTS,
  getFitnessProfile,
  getWorkoutForDate,
  getWeekPlan,
  findExercise,
  offsetDateOnly,
  startOfWeek
} = require('../services/fitnessPlan');

const router = express.Router();
const MEAL_SLOT_KEYS = new Set(MEAL_SLOTS.map(slot => slot.key));
const MEAL_STATUSES = new Set(['on_plan', 'flexible', 'missed']);

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

function countCompletedExercises(workout, log) {
  const exerciseLogs = mapToObject(log?.exerciseLogs);
  return workout.exercises.reduce(
    (count, exercise) => count + (exerciseLogs[exercise.key]?.completed ? 1 : 0),
    0
  );
}

function buildWeek(gender, today, logs) {
  const logByDate = new Map(logs.map(log => [String(log.date), log]));
  return getWeekPlan(gender, today).map(({ date, workout }) => {
    const log = logByDate.get(date) || null;
    return {
      date,
      isToday: date === today,
      workout,
      completed: Boolean(log?.workoutCompletedAt),
      completedExercises: countCompletedExercises(workout, log),
      totalExercises: workout.exercises.length
    };
  });
}

function buildProgress(gender, today, logs) {
  const since = offsetDateOnly(today, -27);
  const recent = logs.filter(log => String(log.date) >= since && String(log.date) <= today);
  let plannedWorkouts = 0;
  for (let date = since; date && date <= today; date = offsetDateOnly(date, 1)) {
    if (getWorkoutForDate(gender, date).type !== 'rest') plannedWorkouts += 1;
  }

  let recordedMeals = 0;
  let onPlanMeals = 0;
  for (const log of recent) {
    for (const meal of Object.values(mapToObject(log.mealLogs))) {
      if (!meal?.status) continue;
      recordedMeals += 1;
      if (meal.status === 'on_plan') onPlanMeals += 1;
    }
  }

  return {
    days: 28,
    completedWorkouts: recent.filter(log => log.workoutCompletedAt).length,
    plannedWorkouts,
    recordedMeals,
    onPlanMeals
  };
}

function buildParticipant(user, isMine, today, logs, healthRecords) {
  const userId = String(user._id);
  const userLogs = logs.filter(log => String(log.userId) === userId);
  const todayWorkout = getWorkoutForDate(user.gender, today);
  const todayLog = userLogs.find(log => String(log.date) === today) || null;
  return {
    user: compactUser(user, isMine),
    profile: getFitnessProfile(user.gender),
    today: {
      date: today,
      workout: todayWorkout,
      log: serializeLog(todayLog),
      canEdit: isMine
    },
    week: buildWeek(user.gender, today, userLogs),
    progress: buildProgress(user.gender, today, userLogs),
    health: latestHealthFor(healthRecords, userId)
  };
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
  const weight = Number(value);
  if (!Number.isFinite(weight) || weight < 0 || weight > 500) {
    return { error: '训练重量需要在0到500kg之间' };
  }
  return { value: Math.round(weight * 10) / 10 };
}

function normalizePositiveArray(value, expectedLength, max, label) {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    return { error: `${label}需要完整记录${expectedLength}组` };
  }
  const numbers = value.map(Number);
  if (numbers.some(number => !Number.isInteger(number) || number < 1 || number > max)) {
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
    actualSeconds: [],
    durationMinutes: null,
    weightKg: weight.value,
    completedAt: body.completed ? new Date() : null
  };

  if (!body.completed) return { value };
  if (exercise.tracking === 'reps') {
    const reps = normalizePositiveArray(body.actualReps, exercise.sets, 200, '实际次数');
    if (reps.error) return reps;
    value.actualReps = reps.value;
  } else if (exercise.tracking === 'seconds') {
    const seconds = normalizePositiveArray(body.actualSeconds, exercise.sets, 3600, '实际秒数');
    if (seconds.error) return seconds;
    value.actualSeconds = seconds.value;
  } else if (exercise.tracking === 'minutes') {
    const minutes = Number(body.durationMinutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) {
      return { error: '实际分钟数记录不正确' };
    }
    value.durationMinutes = minutes;
  }
  return { value };
}

async function updateDailyLog(filter, workout, path, value) {
  const base = {
    coupleId: filter.coupleId,
    userId: filter.userId,
    date: filter.date
  };
  const update = {
    $setOnInsert: base,
    $set: {
      planVersion: PLAN_VERSION,
      workoutKey: workout.key,
      [path]: value
    }
  };

  try {
    return await FitnessDailyLog.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      runValidators: true
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return FitnessDailyLog.findOneAndUpdate(filter, update, {
      new: true,
      runValidators: true
    });
  }
}

async function syncWorkoutCompletion(log, workout) {
  if (!log) return null;
  const completionChecks = workout.exercises.map(
    exercise => ({ $eq: [`$exerciseLogs.${exercise.key}.completed`, true] })
  );
  return FitnessDailyLog.findOneAndUpdate(
    { _id: log._id },
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
    const logs = await FitnessDailyLog.find({ coupleId: context.coupleId, date: today }).lean();
    const mine = logs.find(log => String(log.userId) === context.userId);
    const partner = logs.find(log => String(log.userId) === context.partnerId);
    const workout = getWorkoutForDate(context.user.gender, today);
    res.json({
      success: true,
      data: {
        date: today,
        workoutLabel: workout.label,
        durationMinutes: workout.durationMinutes,
        completed: Boolean(mine?.workoutCompletedAt),
        partnerCompleted: Boolean(partner?.workoutCompletedAt)
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
    const [logs, healthRecords] = await Promise.all([
      FitnessDailyLog.find({
        coupleId: context.coupleId,
        date: { $gte: since, $lte: today }
      }).sort({ date: -1 }).lean(),
      HealthRecord.find({ coupleId: context.coupleId })
        .sort({ recordedAt: -1, updatedAt: -1, createdAt: -1 })
        .lean()
    ]);

    res.json({
      success: true,
      data: {
        planVersion: PLAN_VERSION,
        today,
        weekStart: startOfWeek(today),
        mealSlots: MEAL_SLOTS,
        mine: buildParticipant(context.user, true, today, logs, healthRecords),
        partner: buildParticipant(context.partner, false, today, logs, healthRecords)
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
    const workout = getWorkoutForDate(context.user.gender, today);
    const exercise = findExercise(workout, req.params.exerciseKey);
    if (!exercise || workout.type === 'rest') {
      return res.status(404).json({ success: false, message: '今天没有这个训练动作' });
    }
    const normalized = normalizeExercisePayload(req.body, exercise);
    if (normalized.error) {
      return res.status(400).json({ success: false, message: normalized.error });
    }

    const filter = { coupleId: context.coupleId, userId: context.userId, date: today };
    let log = await updateDailyLog(
      filter,
      workout,
      `exerciseLogs.${exercise.key}`,
      normalized.value
    );
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
        ? '今天的训练全部完成了'
        : (normalized.value.completed ? '这一项已经记下' : '这一项已恢复为待完成'),
      data: { log: serializeLog(log) }
    });
  } catch (error) {
    logError('更新健身动作失败:', error);
    res.status(500).json({ success: false, message: '训练记录没有保存，请稍后重试' });
  }
});

router.patch('/today/meals/:slot', authMiddleware, async (req, res) => {
  try {
    const context = await resolveCouple(req, res);
    if (!context) return;
    const slot = String(req.params.slot || '');
    if (!MEAL_SLOT_KEYS.has(slot) || !MEAL_STATUSES.has(req.body?.status)) {
      return res.status(400).json({ success: false, message: '餐次记录无效' });
    }
    const note = String(req.body?.note || '').trim();
    if (note.length > 120) {
      return res.status(400).json({ success: false, message: '餐食说明不能超过120字' });
    }

    const today = helpers.getTodayString();
    const workout = getWorkoutForDate(context.user.gender, today);
    const filter = { coupleId: context.coupleId, userId: context.userId, date: today };
    const log = await updateDailyLog(
      filter,
      workout,
      `mealLogs.${slot}`,
      { status: req.body.status, note, recordedAt: new Date() }
    );
    emitFitnessSync(req, context.coupleId, 'mealUpdate', {
      date: today,
      slot,
      status: req.body.status
    });

    res.json({
      success: true,
      message: '这顿饭已经记下',
      data: { log: serializeLog(log) }
    });
  } catch (error) {
    logError('更新健身饮食记录失败:', error);
    res.status(500).json({ success: false, message: '饮食记录没有保存，请稍后重试' });
  }
});

module.exports = router;
