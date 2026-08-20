// ============================================
// 考研进度板路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User, PostgraduateProgress } = require('../models');
const { getPushPayload } = require('../config/notifications');
const { logError } = require('../utils/safeLogger');
const { getTodayString } = require('../utils/helpers');

const router = express.Router();

// 获取今天日期字符串
const getTodayStr = () => getTodayString();

const DEFAULT_SUBJECTS = [
  {
    key: 'math',
    name: '数学',
    color: '#7c3aed',
    icon: '∫',
    tasks: [
      { key: 'math_lecture', label: '完成课程', unit: '讲', targetAmount: 1, cadenceDays: 1 }
    ],
    progressTracks: [
      { key: 'lectures', label: '高数讲次', current: 8, total: 15, unit: '讲', mode: 'position', currentLabel: '第 8 讲', nextLabel: '第 9 讲' },
      { key: 'videos', label: '数学视频', current: 50, total: 108, unit: '个视频', mode: 'completion' }
    ]
  },
  {
    key: 'english',
    name: '英语',
    color: '#2563eb',
    icon: 'A',
    tasks: [
      { key: 'english_questions', label: '刷题', unit: '题', targetAmount: 40, cadenceDays: 1 }
    ],
    progressTracks: [
      { key: 'videos', label: '课程视频', current: 3, total: 34, unit: '个视频', mode: 'completion' }
    ]
  },
  {
    key: 'organic-chemistry',
    name: '有机化学',
    color: '#0891b2',
    icon: '⚗',
    tasks: [
      { key: 'chemistry_lessons', label: '看课', unit: '节', targetAmount: 1, cadenceDays: 1 },
      { key: 'chemistry_questions', label: '做题', unit: '题', targetAmount: 30, cadenceDays: 1 }
    ],
    progressTracks: [
      { key: 'chapters', label: '章节位置', current: 6, total: 24, unit: '章', mode: 'position', currentLabel: '第 6 章', nextLabel: '第 7 章' },
      { key: 'videos', label: '课程视频', current: 22, total: 75, unit: '个视频', mode: 'completion' }
    ]
  },
  {
    key: 'politics',
    name: '政治',
    color: '#dc2626',
    icon: '旗',
    tasks: [
      { key: 'politics_recite', label: '背诵', unit: '页', targetAmount: 5, cadenceDays: 1 },
      { key: 'politics_questions', label: '做题', unit: '题', targetAmount: 30, cadenceDays: 1 }
    ],
    progressTracks: [
      { key: 'knowledge-points', label: '马原考点', current: 6, total: 95, unit: '个考点', mode: 'completion' }
    ]
  }
];

const SUBJECT_KEY_ALIASES = {
  '化学': 'organic-chemistry',
  '有机化学': 'organic-chemistry',
  '数学': 'math',
  '英语': 'english',
  '政治': 'politics'
};

const DEFAULT_WEEKLY_SCHEDULE = {
  1: ['数学', '英语', '有机化学', '政治'],
  2: ['数学', '英语', '有机化学', '政治'],
  3: ['数学', '英语', '有机化学', '政治'],
  4: ['数学', '英语', '有机化学', '政治'],
  5: ['数学', '英语', '有机化学', '政治'],
  6: ['数学', '英语', '政治'],
  0: ['休息']
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clampNumber(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function getPlain(value) {
  return value?.toObject ? value.toObject() : value;
}

function taskKeyFrom(label, index) {
  const clean = String(label || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return clean || `task_${index + 1}`;
}

function getDefaultSubject(subject = {}) {
  const raw = typeof subject === 'string' ? { name: subject } : (getPlain(subject) || {});
  const key = String(raw.key || SUBJECT_KEY_ALIASES[raw.name] || '');
  return DEFAULT_SUBJECTS.find(item => item.key === key || item.name === raw.name) || null;
}

function normalizeTask(task, fallback = {}, index = 0) {
  const raw = getPlain(task) || {};
  const base = fallback || {};
  const label = String(raw.label || base.label || '学习任务').trim().slice(0, 30);
  const unit = String(raw.unit || base.unit || '').trim().slice(0, 10);
  return {
    key: String(raw.key || base.key || taskKeyFrom(label, index)).trim().slice(0, 50),
    label,
    unit,
    targetAmount: clampNumber(raw.targetAmount ?? base.targetAmount, 0, 10000, 1),
    cadenceDays: Math.round(clampNumber(raw.cadenceDays ?? base.cadenceDays, 1, 14, 1)),
    startDate: String(raw.startDate || base.startDate || '').trim().slice(0, 10),
    enabled: raw.enabled !== false,
    order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : index
  };
}

function normalizeProgressTrack(track, fallback = {}, index = 0) {
  const raw = getPlain(track) || {};
  const base = fallback || {};
  const total = Math.max(1, Math.round(clampNumber(base.total ?? raw.total, 1, 100000, 1)));
  const current = Math.round(clampNumber(raw.current ?? base.current, 0, total, 0));
  return {
    key: String(base.key || raw.key || `track_${index + 1}`).trim().slice(0, 50),
    label: String(base.label || raw.label || '学习进度').trim().slice(0, 30),
    current,
    total,
    unit: String(base.unit || raw.unit || '').trim().slice(0, 12),
    mode: (base.mode || raw.mode) === 'position' ? 'position' : 'completion',
    currentLabel: String(raw.currentLabel || base.currentLabel || '').trim().slice(0, 30),
    nextLabel: String(raw.nextLabel || base.nextLabel || '').trim().slice(0, 30)
  };
}

function normalizeProgressTracks(tracks, fallbackTracks = []) {
  const source = Array.isArray(tracks) ? tracks.map(getPlain) : [];
  const normalizedDefaults = fallbackTracks.map((fallback, index) => {
    const match = source.find(track => String(track?.key || '') === fallback.key);
    return normalizeProgressTrack(match, fallback, index);
  });
  const defaultKeys = new Set(fallbackTracks.map(track => track.key));
  const compatibleExtras = source
    .filter(track => track?.key && !defaultKeys.has(String(track.key)))
    .map((track, index) => normalizeProgressTrack(track, {}, fallbackTracks.length + index));
  return [...normalizedDefaults, ...compatibleExtras];
}

function normalizeSubject(subject, index = 0) {
  const raw = getPlain(subject) || {};
  const defaultSubject = getDefaultSubject(raw);
  const defaultTasks = defaultSubject?.tasks || [];
  const rawTasks = Array.isArray(raw.tasks) && raw.tasks.length > 0 ? raw.tasks : defaultTasks;
  const rounds = Array.isArray(raw.rounds) && raw.rounds.length > 0
    ? raw.rounds
    : [{ roundName: '一轮', progress: raw.progress || 0, currentUnit: raw.currentUnit || '', totalUnit: raw.totalUnit || '' }];

  return {
    key: String(defaultSubject?.key || raw.key || '').trim().slice(0, 50),
    name: String(raw.name || defaultSubject?.name || `科目${index + 1}`).trim().slice(0, 20),
    currentRound: Math.round(clampNumber(raw.currentRound, 0, Math.max(rounds.length - 1, 0), 0)),
    rounds: rounds.map((round, roundIndex) => {
      const item = getPlain(round) || {};
      return {
        roundName: String(item.roundName || `第${roundIndex + 1}轮`).trim().slice(0, 12),
        progress: clampNumber(item.progress, 0, 100, 0),
        currentUnit: String(item.currentUnit || '').trim().slice(0, 40),
        totalUnit: String(item.totalUnit || '').trim().slice(0, 40)
      };
    }),
    tasks: rawTasks.map((task, taskIndex) => normalizeTask(task, defaultTasks[taskIndex], taskIndex)),
    progressTracks: normalizeProgressTracks(raw.progressTracks, defaultSubject?.progressTracks || []),
    color: String(raw.color || defaultSubject?.color || '#8b5cf6').trim().slice(0, 24),
    icon: String(raw.icon || defaultSubject?.icon || '').trim().slice(0, 8)
  };
}

function normalizeSubjects(subjects) {
  const source = Array.isArray(subjects) && subjects.length > 0 ? subjects : clone(DEFAULT_SUBJECTS);
  return source
    .map(normalizeSubject)
    .filter(subject => subject.name);
}

function ensureRequiredProgressSubjects(subjects) {
  const result = [...subjects];
  DEFAULT_SUBJECTS.forEach((defaultSubject) => {
    const exists = result.some(subject => subject.key === defaultSubject.key);
    if (!exists) result.push(normalizeSubject(defaultSubject, result.length));
  });
  return result;
}

function preserveProgressTracks(nextSubjects, previousSubjects = []) {
  const previous = Array.isArray(previousSubjects)
    ? previousSubjects.map((subject, index) => normalizeSubject(subject, index))
    : [];

  return nextSubjects.map((subject) => {
    const existing = previous.find(item =>
      (subject.key && item.key === subject.key) || item.name === subject.name
    );
    const defaultSubject = getDefaultSubject(subject);
    return {
      ...subject,
      progressTracks: existing?.progressTracks || normalizeProgressTracks([], defaultSubject?.progressTracks || [])
    };
  });
}

function scheduleEntries(schedule) {
  if (!schedule) return [];
  if (schedule instanceof Map) return [...schedule.entries()];
  if (typeof schedule.get === 'function' && typeof schedule.forEach === 'function') {
    const entries = [];
    schedule.forEach((value, key) => entries.push([key, value]));
    return entries;
  }
  return Object.entries(schedule);
}

function normalizeWeeklySchedule(schedule, subjects) {
  const subjectNames = new Set(subjects.map(subject => subject.name));
  const sourceEntries = scheduleEntries(schedule);
  const source = sourceEntries.length > 0 ? Object.fromEntries(sourceEntries) : DEFAULT_WEEKLY_SCHEDULE;
  const normalized = {};
  Object.entries(source).forEach(([key, value]) => {
    if (!/^[0-6]$/.test(String(key))) return;
    const items = Array.isArray(value) ? value : [];
    const cleanItems = [...new Set(items.map(String).filter(name => name === '休息' || subjectNames.has(name)))];
    if (cleanItems.length > 0) normalized[String(key)] = cleanItems;
  });
  return normalized;
}

function ensurePlanStructure(progress) {
  let changed = false;
  const normalizedSubjects = ensureRequiredProgressSubjects(normalizeSubjects(progress.subjects));
  if (JSON.stringify((progress.subjects || []).map(getPlain)) !== JSON.stringify(normalizedSubjects)) {
    progress.subjects = normalizedSubjects;
    changed = true;
  }

  const normalizedSchedule = normalizeWeeklySchedule(progress.weeklySchedule, normalizedSubjects);
  if (JSON.stringify(Object.fromEntries(scheduleEntries(progress.weeklySchedule))) !== JSON.stringify(normalizedSchedule)) {
    progress.weeklySchedule = normalizedSchedule;
    changed = true;
  }

  if (!progress.archiveRepository?.name) {
    progress.archiveRepository = {
      name: '考研全过程档案',
      status: 'active',
      createdAt: new Date(),
      lastArchivedAt: null,
      entries: []
    };
    changed = true;
  }

  return changed;
}

function getProgressTrackDefinition(subjectKey, trackKey) {
  const subject = DEFAULT_SUBJECTS.find(item => item.key === subjectKey);
  const track = subject?.progressTracks?.find(item => item.key === trackKey);
  return subject && track ? { subject, track } : null;
}

function findProgressTrack(progress, subjectKey, trackKey) {
  const subject = (progress?.subjects || []).find(item => String(item.key || '') === subjectKey);
  const track = subject?.progressTracks?.find(item => String(item.key || '') === trackKey);
  return track ? getPlain(track) : null;
}

function parseDateOnly(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }
  return date;
}

function diffCalendarDays(later, earlier) {
  const laterDate = parseDateOnly(later);
  const earlierDate = parseDateOnly(earlier);
  if (!laterDate || !earlierDate) return null;
  const laterDay = Date.UTC(laterDate.getFullYear(), laterDate.getMonth(), laterDate.getDate());
  const earlierDay = Date.UTC(earlierDate.getFullYear(), earlierDate.getMonth(), earlierDate.getDate());
  return Math.round((laterDay - earlierDay) / (24 * 60 * 60 * 1000));
}

function getWeekdaySubjects(progress, weekday) {
  const key = String(weekday);
  const entries = Object.fromEntries(scheduleEntries(progress.weeklySchedule));
  return Array.isArray(entries[key]) ? entries[key] : [];
}

function isTaskDue(task, todayStr, fallbackStartDate) {
  if (!task.enabled) return false;
  if (task.cadenceDays <= 1) return true;
  const startDate = task.startDate || fallbackStartDate || todayStr;
  const diff = diffCalendarDays(todayStr, startDate);
  if (diff === null || diff < 0) return false;
  return diff % task.cadenceDays === 0;
}

function cadenceLabel(task) {
  return task.cadenceDays > 1 ? `每${task.cadenceDays}天` : '每天';
}

function buildTodayTaskGroups(progress, todayStr = getTodayStr()) {
  const todayWeekday = parseDateOnly(todayStr).getDay();
  const todaySubjects = getWeekdaySubjects(progress, todayWeekday);
  if (todaySubjects.includes('休息')) return [];
  const fallbackStartDate = progress.createdAt ? getTodayString(progress.createdAt) : todayStr;
  const subjects = normalizeSubjects(progress.subjects);
  return todaySubjects
    .map(subjectName => {
      const subject = subjects.find(item => item.name === subjectName);
      if (!subject) return null;
      const tasks = subject.tasks
        .filter(task => isTaskDue(task, todayStr, fallbackStartDate))
        .sort((a, b) => a.order - b.order)
        .map(task => ({
          subjectName: subject.name,
          subjectColor: subject.color,
          taskKey: task.key,
          label: task.label,
          unit: task.unit,
          targetAmount: task.targetAmount,
          cadenceDays: task.cadenceDays,
          cadenceLabel: cadenceLabel(task)
        }));
      return tasks.length > 0 ? { subjectName: subject.name, color: subject.color, icon: subject.icon, tasks } : null;
    })
    .filter(Boolean);
}

function flattenTaskGroups(groups) {
  return groups.flatMap(group => group.tasks);
}

function taskStatus(completedAmount, targetAmount) {
  if (targetAmount <= 0 || completedAmount >= targetAmount) return 'done';
  if (completedAmount > 0) return 'partial';
  return 'missed';
}

function buildTaskRecords(progress, submittedRecords, todayStr) {
  const taskPlan = flattenTaskGroups(buildTodayTaskGroups(progress, todayStr));
  const submitted = Array.isArray(submittedRecords) ? submittedRecords : [];
  return taskPlan.map(task => {
    const match = submitted.find(item =>
      String(item.subjectName || '') === task.subjectName &&
      String(item.taskKey || '') === task.taskKey
    );
    const completedAmount = clampNumber(match?.completedAmount, 0, 10000, 0);
    return {
      subjectName: task.subjectName,
      taskKey: task.taskKey,
      label: task.label,
      unit: task.unit,
      targetAmount: task.targetAmount,
      completedAmount,
      cadenceDays: task.cadenceDays,
      status: taskStatus(completedAmount, task.targetAmount)
    };
  });
}

function completionRate(taskRecords) {
  if (!taskRecords.length) return 0;
  const ratios = taskRecords.map(record => {
    if (record.targetAmount <= 0) return 1;
    return Math.min(1, record.completedAmount / record.targetAmount);
  });
  return Math.round(ratios.reduce((sum, value) => sum + value, 0) / ratios.length * 100);
}

function buildArchiveSummary(progress) {
  const checkIns = progress.checkIns || [];
  const taskRecords = checkIns.flatMap(checkIn => checkIn.taskRecords || []);
  const doneTasks = taskRecords.filter(task => task.status === 'done').length;
  const partialTasks = taskRecords.filter(task => task.status === 'partial').length;
  const missedTasks = taskRecords.filter(task => task.status === 'missed').length;
  return {
    totalDays: checkIns.length,
    streak: calculateStreak(checkIns),
    averageCompletionRate: checkIns.length
      ? Math.round(checkIns.reduce((sum, checkIn) => sum + (checkIn.completionRate || 0), 0) / checkIns.length)
      : 0,
    doneTasks,
    partialTasks,
    missedTasks,
    subjects: normalizeSubjects(progress.subjects).map(subject => ({
      name: subject.name,
      tasks: subject.tasks.map(task => ({
        label: task.label,
        targetAmount: task.targetAmount,
        unit: task.unit,
        cadenceDays: task.cadenceDays
      }))
    }))
  };
}

// 计算连续报到天数
const calculateStreak = (checkIns) => {
  if (!checkIns || checkIns.length === 0) return 0;
  const dates = [...new Set(checkIns.map(c => c.date))]
    .filter(date => diffCalendarDays(date, date) === 0)
    .sort((a, b) => b.localeCompare(a));
  if (dates.length === 0) return 0;

  const today = getTodayStr();
  const latestDiff = diffCalendarDays(today, dates[0]);
  if (latestDiff !== 0 && latestDiff !== 1) return 0;

  let streak = 1;
  let previousDate = dates[0];

  // 往前数连续天数
  for (let checkIndex = 1; checkIndex < dates.length; checkIndex += 1) {
    if (diffCalendarDays(previousDate, dates[checkIndex]) === 1) {
      streak++;
      previousDate = dates[checkIndex];
    } else {
      break;
    }
  }

  return streak;
};

/**
 * @route   GET /api/postgraduate
 * @desc    获取考研进度
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    }

    const coupleId = [userId, user.partnerId].sort().join('_');
    let progress = await PostgraduateProgress.findOne({ coupleId });

    if (!progress) {
      progress = new PostgraduateProgress({
        coupleId,
        subjects: normalizeSubjects(),
        weeklySchedule: DEFAULT_WEEKLY_SCHEDULE
      });
      await progress.save();
    } else if (ensurePlanStructure(progress)) {
      await progress.save();
    }

    const todayStr = getTodayStr();
    const todayWeekday = parseDateOnly(todayStr).getDay();
    const todaySubjects = getWeekdaySubjects(progress, todayWeekday);
    const todayTaskGroups = buildTodayTaskGroups(progress, todayStr);
    const todayTasks = flattenTaskGroups(todayTaskGroups);

    let daysLeft = null;
    if (progress.targetDate) {
      const diff = diffCalendarDays(progress.targetDate, todayStr);
      daysLeft = diff === null ? null : Math.max(0, diff);
    }

    const todayCheckIn = progress.checkIns?.find(c => c.date === todayStr);
    const streak = calculateStreak(progress.checkIns || []);
    const archiveReady = progress.targetDate ? daysLeft === 0 : false;

    res.json({
      success: true,
      data: {
        ...progress.toObject(),
        todaySubjects,
        todayTaskGroups,
        todayTasks,
        todayCompletionRate: todayCheckIn?.completionRate || 0,
        daysLeft,
        archiveReady,
        todayWeekday,
        todayCheckedIn: !!todayCheckIn,
        todayCheckIn: todayCheckIn || null,
        streak
      }
    });
  } catch (error) {
    logError('获取考研进度出错:', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   PUT /api/postgraduate
 * @desc    更新考研进度
 * @access  Private
 */
router.put('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    }

    const coupleId = [userId, user.partnerId].sort().join('_');
    const { subjects, weeklySchedule, targetDate, notes } = req.body;

    const updateFields = {};
    const existingProgress = subjects !== undefined || weeklySchedule !== undefined
      ? await PostgraduateProgress.findOne({ coupleId })
      : null;
    const normalizedSubjects = subjects !== undefined
      ? preserveProgressTracks(normalizeSubjects(subjects), existingProgress?.subjects)
      : null;
    if (normalizedSubjects) updateFields.subjects = normalizedSubjects;
    if (weeklySchedule !== undefined) {
      updateFields.weeklySchedule = normalizeWeeklySchedule(
        weeklySchedule,
        normalizedSubjects || normalizeSubjects(existingProgress?.subjects)
      );
    }
    if (targetDate !== undefined) updateFields.targetDate = targetDate;
    if (notes !== undefined) updateFields.notes = notes;
    updateFields.updatedAt = new Date();

    let progress = await PostgraduateProgress.findOneAndUpdate(
      { coupleId },
      { $set: updateFields },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const broadcastToCouple = req.app.locals.broadcastToCouple;
    if (broadcastToCouple) {
      broadcastToCouple(coupleId, {
        type: 'postgraduateSync',
        data: { action: 'update', payload: progress.toObject(), timestamp: Date.now() }
      });
    }

    res.json({ success: true, message: '更新成功', data: progress });
  } catch (error) {
    logError('更新考研进度出错:', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   PATCH /api/postgraduate/progress
 * @desc    原子登记或修正多个固定学习单位
 * @access  Private
 */
router.patch('/progress', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    }

    const subjectKey = String(req.body.subjectKey || '').trim();
    const trackKey = String(req.body.trackKey || '').trim();
    const action = String(req.body.action || '').trim();
    const definition = getProgressTrackDefinition(subjectKey, trackKey);
    const amount = Number(req.body.amount);
    if (
      !definition ||
      !['increment', 'decrement'].includes(action) ||
      !Number.isInteger(amount) ||
      amount < 1 ||
      amount > definition.track.total
    ) {
      return res.status(400).json({ success: false, message: '进度操作无效' });
    }

    const coupleId = [userId, user.partnerId].sort().join('_');
    let currentProgress = await PostgraduateProgress.findOne({ coupleId });
    if (!currentProgress) {
      currentProgress = new PostgraduateProgress({
        coupleId,
        subjects: normalizeSubjects(),
        weeklySchedule: DEFAULT_WEEKLY_SCHEDULE
      });
      await currentProgress.save();
    } else if (ensurePlanStructure(currentProgress)) {
      await currentProgress.save();
    }

    const delta = action === 'increment' ? amount : -amount;
    const currentCondition = action === 'increment'
      ? { $lte: definition.track.total - amount }
      : { $gte: amount };
    const updated = await PostgraduateProgress.findOneAndUpdate(
      {
        coupleId,
        subjects: {
          $elemMatch: {
            key: subjectKey,
            progressTracks: { $elemMatch: { key: trackKey, current: currentCondition } }
          }
        }
      },
      { $inc: { 'subjects.$[subject].progressTracks.$[track].current': delta } },
      {
        new: true,
        arrayFilters: [
          { 'subject.key': subjectKey },
          { 'track.key': trackKey }
        ]
      }
    );

    if (!updated) {
      const latest = await PostgraduateProgress.findOne({ coupleId });
      const track = findProgressTrack(latest, subjectKey, trackKey);
      return res.json({
        success: true,
        message: action === 'increment' ? '本次数量超过剩余进度' : '本次数量超过当前进度',
        data: { changed: false, subjectKey, trackKey, track, subjects: latest?.subjects || [] }
      });
    }

    const track = findProgressTrack(updated, subjectKey, trackKey);
    const broadcastToCouple = req.app.locals.broadcastToCouple;
    if (broadcastToCouple) {
      broadcastToCouple(coupleId, {
        type: 'postgraduateSync',
        data: { action: 'progress', subjectKey, trackKey, timestamp: Date.now() }
      });
    }

    res.json({
      success: true,
      message: action === 'increment'
        ? `本次完成 ${amount}${definition.track.unit}`
        : `已修正减少 ${amount}${definition.track.unit}`,
      data: { changed: true, subjectKey, trackKey, track, subjects: updated.subjects || [] }
    });
  } catch (error) {
    logError('更新考研进度出错:', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   POST /api/postgraduate/checkin
 * @desc    今日学习报到
 * @access  Private
 */
router.post('/checkin', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    }

    const { subjects, taskRecords, note } = req.body;
    const coupleId = [userId, user.partnerId].sort().join('_');
    const todayStr = getTodayStr();
    let currentProgress = await PostgraduateProgress.findOne({ coupleId });
    if (!currentProgress) {
      currentProgress = new PostgraduateProgress({
        coupleId,
        subjects: normalizeSubjects(),
        weeklySchedule: DEFAULT_WEEKLY_SCHEDULE
      });
      await currentProgress.save();
    } else if (ensurePlanStructure(currentProgress)) {
      await currentProgress.save();
    }

    let normalizedTaskRecords = buildTaskRecords(currentProgress, taskRecords, todayStr);
    if (!Array.isArray(taskRecords) && Array.isArray(subjects) && subjects.length > 0) {
      const selectedSubjects = new Set(subjects.map(String));
      const completedLegacyTasks = flattenTaskGroups(buildTodayTaskGroups(currentProgress, todayStr))
        .filter(task => selectedSubjects.has(task.subjectName))
        .map(task => ({
          subjectName: task.subjectName,
          taskKey: task.taskKey,
          completedAmount: task.targetAmount
        }));
      normalizedTaskRecords = buildTaskRecords(currentProgress, completedLegacyTasks, todayStr);
    }
    const rate = completionRate(normalizedTaskRecords);
    const completedSubjects = normalizedTaskRecords.length
      ? [...new Set(normalizedTaskRecords.filter(task => task.completedAmount > 0).map(task => task.subjectName))]
      : (Array.isArray(subjects) ? subjects.map(String).filter(Boolean) : []);

    // 使用原子操作更新
    await PostgraduateProgress.findOneAndUpdate(
      { coupleId },
      {
        $pull: { checkIns: { date: todayStr } }
      },
      { new: true }
    );

    const updated = await PostgraduateProgress.findOneAndUpdate(
      { coupleId },
      {
        $push: {
          checkIns: {
            date: todayStr,
            subjects: completedSubjects,
            taskRecords: normalizedTaskRecords,
            completionRate: rate,
            note: note || '',
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );

    const streak = calculateStreak(updated.checkIns || []);
    const todayCheckIn = updated.checkIns?.find(c => c.date === todayStr);

    // WebSocket 同步
    const broadcastToCouple = req.app.locals.broadcastToCouple;
    if (broadcastToCouple) {
      broadcastToCouple(coupleId, {
        type: 'postgraduateSync',
        data: { action: 'checkin', date: todayStr, timestamp: Date.now() }
      });
    }

    // 推送通知给伴侣
    const sendNotification = req.app.locals.sendNotification;
    if (sendNotification && user.partnerId) {
      const subjectStr = completedSubjects.length > 0 ? completedSubjects.join('、') : '完成了今日学习';
      const completionText = normalizedTaskRecords.length > 0 ? `，完成率 ${rate}%` : '';
      const payload = getPushPayload('postgraduateReminder', {
        nickname: user.nickname,
        title: '学习报到',
        body: `${user.nickname}今日已报到，学了：${subjectStr}${completionText}${note ? '（' + note + '）' : ''}`
      }, { url: '/postgraduate' });
      payload.title = '学习报到';
      payload.body = `${user.nickname}今日已报到，学了：${subjectStr}${completionText}${note ? '（' + note + '）' : ''}`;
      await sendNotification(user.partnerId, payload);
    }

    res.json({
      success: true,
      message: '报到成功',
      data: { todayCheckIn, streak, todayCheckedIn: true }
    });
  } catch (error) {
    logError('学习报到出错:', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   DELETE /api/postgraduate/checkin
 * @desc    取消今日报到
 * @access  Private
 */
router.delete('/checkin', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    }

    const coupleId = [userId, user.partnerId].sort().join('_');
    const todayStr = getTodayStr();

    const progress = await PostgraduateProgress.findOneAndUpdate(
      { coupleId },
      { $pull: { checkIns: { date: todayStr } } },
      { new: true }
    );

    const streak = calculateStreak(progress.checkIns || []);

    // WebSocket 同步
    const broadcastToCouple = req.app.locals.broadcastToCouple;
    if (broadcastToCouple) {
      broadcastToCouple(coupleId, {
        type: 'postgraduateSync',
        data: { action: 'cancelCheckin', date: todayStr, timestamp: Date.now() }
      });
    }

    res.json({ success: true, message: '已取消报到', data: { streak, todayCheckedIn: false } });
  } catch (error) {
    logError('取消报到出错:', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   POST /api/postgraduate/notify
 * @desc    发送考研提醒通知给伴侣
 * @access  Private
 */
router.post('/notify', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    }

    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: '标题和内容不能为空' });
    }

    const sendNotification = req.app.locals.sendNotification;
    if (!sendNotification) {
      return res.status(500).json({ success: false, message: '推送服务未配置' });
    }

    const payload = getPushPayload('postgraduateReminder', {
      nickname: user.nickname,
      title,
      body
    }, { url: '/postgraduate' });

    payload.title = title;
    payload.body = body;

    await sendNotification(user.partnerId, payload);

    res.json({ success: true, message: '通知已发送' });
  } catch (error) {
    logError('发送考研通知出错:', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   POST /api/postgraduate/archive
 * @desc    将考研全过程归档到专属档案库
 * @access  Private
 */
router.post('/archive', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    }

    const coupleId = [userId, user.partnerId].sort().join('_');
    let progress = await PostgraduateProgress.findOne({ coupleId });
    if (!progress) {
      progress = new PostgraduateProgress({
        coupleId,
        subjects: normalizeSubjects(),
        weeklySchedule: DEFAULT_WEEKLY_SCHEDULE
      });
    }
    ensurePlanStructure(progress);

    const todayStr = getTodayStr();
    const daysUntilTarget = progress.targetDate ? diffCalendarDays(progress.targetDate, todayStr) : null;
    if (daysUntilTarget === null || daysUntilTarget > 0) {
      return res.status(400).json({ success: false, message: '目标日期后才能归档' });
    }

    const repositoryName = String(req.body.repositoryName || progress.archiveRepository?.name || '考研全过程档案')
      .trim()
      .slice(0, 40) || '考研全过程档案';
    const summary = buildArchiveSummary(progress);
    const snapshot = {
      targetDate: progress.targetDate || '',
      notes: progress.notes || '',
      subjects: normalizeSubjects(progress.subjects),
      weeklySchedule: Object.fromEntries(scheduleEntries(progress.weeklySchedule)),
      checkIns: progress.checkIns || [],
      summary
    };
    const entry = {
      archivedAt: new Date(),
      repositoryName,
      targetDate: progress.targetDate || '',
      summary,
      snapshot
    };

    progress.archiveRepository = {
      name: repositoryName,
      status: 'archived',
      createdAt: progress.archiveRepository?.createdAt || new Date(),
      lastArchivedAt: entry.archivedAt,
      entries: [...(progress.archiveRepository?.entries || []), entry]
    };

    await progress.save();

    const latestArchive = progress.archiveRepository.entries[progress.archiveRepository.entries.length - 1];
    const broadcastToCouple = req.app.locals.broadcastToCouple;
    if (broadcastToCouple) {
      broadcastToCouple(coupleId, {
        type: 'postgraduateSync',
        data: { action: 'archive', payload: { repositoryName, summary }, timestamp: Date.now() }
      });
    }

    res.json({
      success: true,
      message: '考研全过程已归档',
      data: {
        archiveRepository: progress.archiveRepository,
        latestArchive
      }
    });
  } catch (error) {
    logError('归档考研过程出错:', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

module.exports = router;
