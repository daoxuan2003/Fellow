// ============================================
// 通知定时任务调度器
// ============================================

const cron = require('node-cron');
const { User, Habit, CheckIn } = require('../models');
const { getPushPayload } = require('../config/notifications');
const webpush = require('web-push');
const { formatDate, getTodayString } = require('../utils/helpers');
const { logError } = require('../utils/safeLogger');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const WEEKLY_REPORT_DAYS = 7;
const debugLog = (...args) => {
  if (!IS_PRODUCTION) console.log(...args);
};

// VAPID 配置
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

// 配置 web-push
if (VAPID_PRIVATE_KEY && VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

/**
 * 发送推送通知给指定用户
 * @param {string} userId - 用户ID
 * @param {object} notification - 通知内容
 */
async function sendNotification(userId, notification, settingKey = 'dailyReminder') {
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return false;
    }

    // 检查当前通知类型对应的用户开关，避免每日提醒误拦截周报等通知
    if (settingKey && user.notificationSettings?.[settingKey] === false) {
      return false;
    }

    const payload = JSON.stringify(notification);

    const sendTasks = user.pushSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        }, payload);
      } catch (err) {
        debugLog('推送发送失败:', err.message);
      }
    });

    await Promise.all(sendTasks);
    return true;
  } catch (error) {
    debugLog('发送通知出错:', error.message);
    return false;
  }
}

function getRecentReportDates(now = new Date(), days = WEEKLY_REPORT_DAYS) {
  const base = new Date(now);
  const totalDays = Number.isFinite(Number(days)) ? Math.max(1, Number(days)) : WEEKLY_REPORT_DAYS;
  const dates = [];

  for (let offset = totalDays - 1; offset >= 0; offset--) {
    const date = new Date(base);
    date.setDate(base.getDate() - offset);
    const dateString = formatDate(date);
    if (dateString && !dates.includes(dateString)) {
      dates.push(dateString);
    }
  }

  return dates;
}

function normalizeId(value) {
  return value === undefined || value === null ? '' : String(value);
}

function buildWeeklyReportSummary(checkIns = [], userId, partnerId, weekDates = getRecentReportDates()) {
  const myId = normalizeId(userId);
  const partner = normalizeId(partnerId);
  const validDates = new Set(weekDates);
  const myDates = new Set();
  const partnerDates = new Set();

  for (const checkIn of checkIns || []) {
    if (!validDates.has(checkIn.date)) continue;

    const recordUserId = normalizeId(checkIn.userId);
    if (recordUserId === myId) myDates.add(checkIn.date);
    if (recordUserId === partner) partnerDates.add(checkIn.date);
  }

  return {
    myTotal: myDates.size,
    partnerTotal: partnerDates.size,
    bothCompleted: weekDates.filter(date => myDates.has(date) && partnerDates.has(date)).length,
    totalDays: weekDates.length
  };
}

function buildWeeklyReportPayload(summary, weekDates = []) {
  return getPushPayload('habitWeekendSummary', {
    myCompleted: summary.myTotal,
    partnerCompleted: summary.partnerTotal,
    bothCompleted: summary.bothCompleted,
    total: summary.totalDays
  }, {
    url: '/plans',
    reportRange: 'weekly',
    weekStart: weekDates[0] || '',
    weekEnd: weekDates[weekDates.length - 1] || '',
    myCompleted: summary.myTotal,
    partnerCompleted: summary.partnerTotal,
    bothCompleted: summary.bothCompleted
  });
}

/**
 * 获取用户今天未完成的计划数量
 * @param {string} userId - 用户ID
 * @param {string} partnerId - 伴侣ID
 * @returns {Promise<number>}
 */
async function getPendingHabitsCount(userId, partnerId) {
  try {
    if (!partnerId) return 0;

    const coupleId = [userId, partnerId].sort().join('_');
    const todayStr = getTodayString();

    // 获取该情侣的所有活跃计划
    const habits = await Habit.find({ coupleId, status: 'active' });

    let pendingCount = 0;

    for (const habit of habits) {
      // 检查当前用户是否需要参与此计划
      if (habit.participation === 'self' && habit.createdBy !== userId) continue;
      if (habit.participation === 'partner' && habit.createdBy === userId) continue;

      // 检查今天是否需要打卡
      if (habit.frequency === 'weekly' && habit.weekdays?.length > 0) {
        const todayWeekday = new Date().getDay();
        if (!habit.weekdays.map(Number).includes(todayWeekday)) {
          continue; // 今天不需要打卡
        }
      }

      // 检查是否已打卡
      const checkIn = await CheckIn.findOne({
        habitId: habit._id,
        userId: userId,
        date: todayStr
      });

      if (!checkIn) {
        pendingCount++;
      }
    }

    return pendingCount;
  } catch (error) {
    logError('获取待完成计划数出错:', error);
    return 0;
  }
}

/**
 * 发送每日打卡提醒
 */
async function sendDailyReminders() {
  console.log('[Scheduler] 开始发送每日打卡提醒...', new Date().toISOString());

  try {
    // 获取所有有伴侣且开启了每日提醒的用户
    const users = await User.find({
      partnerId: { $ne: null },
      'notificationSettings.dailyReminder': { $ne: false },
      pushSubscriptions: { $exists: true, $ne: [] }
    });

    console.log(`[Scheduler] 找到 ${users.length} 个需要检查的用户`);

    for (const user of users) {
      const pendingCount = await getPendingHabitsCount(user._id, user.partnerId);

      if (pendingCount > 0) {
        const payload = getPushPayload('habitDailyReminder', { count: pendingCount }, { url: '/plans' });
        await sendNotification(user._id, payload);
        debugLog(`[Scheduler] 已发送提醒给用户 ${user._id}, 待完成: ${pendingCount}`);
      }
    }

    console.log('[Scheduler] 每日打卡提醒发送完成');
  } catch (error) {
    logError('[Scheduler] 发送每日提醒出错:', error);
  }
}

/**
 * 发送周报推送
 */
async function sendWeeklyReports() {
  console.log('[Scheduler] 开始发送周报...', new Date().toISOString());

  try {
    const weekDates = getRecentReportDates();
    // 获取所有有伴侣且开启了周报的用户
    const users = await User.find({
      partnerId: { $ne: null },
      'notificationSettings.weeklyReport': { $ne: false },
      pushSubscriptions: { $exists: true, $ne: [] }
    });

    let sentCount = 0;
    for (const user of users) {
      const userId = normalizeId(user._id);
      const partnerId = normalizeId(user.partnerId);
      if (!userId || !partnerId) continue;

      const coupleId = [userId, partnerId].sort().join('_');
      const checkIns = await CheckIn.find({
        coupleId,
        userId: { $in: [userId, partnerId] },
        date: { $in: weekDates }
      });

      const summary = buildWeeklyReportSummary(checkIns, userId, partnerId, weekDates);
      const payload = buildWeeklyReportPayload(summary, weekDates);
      const sent = await sendNotification(userId, payload, 'weeklyReport');
      if (sent) sentCount++;
    }

    console.log(`[Scheduler] 周报发送完成，已发送 ${sentCount} 条`);
  } catch (error) {
    logError('[Scheduler] 发送周报出错:', error);
  }
}

/**
 * 初始化定时任务
 */
function initNotificationScheduler() {
  console.log('[Scheduler] 初始化通知定时任务...');

  // 每天 20:00 发送打卡提醒
  cron.schedule('0 20 * * *', () => {
    sendDailyReminders();
  }, {
    name: 'daily-habit-reminders',
    timezone: 'Asia/Shanghai',
    noOverlap: true
  });

  // 每周日 21:00 发送周报
  cron.schedule('0 21 * * 0', () => {
    sendWeeklyReports();
  }, {
    name: 'weekly-couple-report',
    timezone: 'Asia/Shanghai',
    noOverlap: true
  });

  console.log('[Scheduler] 定时任务已启动:');
  console.log('  - 每日打卡提醒: 20:00');
  console.log('  - 每周周报: 周日 21:00');
}

module.exports = {
  buildWeeklyReportPayload,
  buildWeeklyReportSummary,
  getRecentReportDates,
  initNotificationScheduler,
  sendNotification,
  sendDailyReminders,
  sendWeeklyReports
};
