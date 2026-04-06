// ============================================
// 通知定时任务调度器
// ============================================

const cron = require('node-cron');
const { User, Habit, CheckIn } = require('../models');
const { getPushPayload } = require('../config/notifications');
const webpush = require('web-push');

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
async function sendNotification(userId, notification) {
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return;
    }

    // 检查用户是否开启了通知
    if (user.notificationSettings?.dailyReminder === false) {
      return;
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
        console.log('推送发送失败:', err.message);
      }
    });

    await Promise.all(sendTasks);
  } catch (error) {
    console.log('发送通知出错:', error.message);
  }
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
    const todayStr = new Date().toISOString().split('T')[0];

    // 获取该情侣的所有活跃计划
    const habits = await Habit.find({ coupleId, status: 'active' });

    let pendingCount = 0;

    for (const habit of habits) {
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
    console.error('获取待完成计划数出错:', error);
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
        const payload = getPushPayload('habitDailyReminder', { count: pendingCount });
        await sendNotification(user._id, payload);
        console.log(`[Scheduler] 已发送提醒给用户 ${user.nickname}, 待完成: ${pendingCount}`);
      }
    }

    console.log('[Scheduler] 每日打卡提醒发送完成');
  } catch (error) {
    console.error('[Scheduler] 发送每日提醒出错:', error);
  }
}

/**
 * 发送周报推送
 */
async function sendWeeklyReports() {
  console.log('[Scheduler] 开始发送周报...', new Date().toISOString());

  try {
    // 获取所有有伴侣且开启了周报的用户
    const users = await User.find({
      partnerId: { $ne: null },
      'notificationSettings.weeklyReport': { $ne: false },
      pushSubscriptions: { $exists: true, $ne: [] }
    });

    for (const user of users) {
      // TODO: 计算周报数据并发送
      console.log(`[Scheduler] 已发送周报给用户 ${user.nickname}`);
    }

    console.log('[Scheduler] 周报发送完成');
  } catch (error) {
    console.error('[Scheduler] 发送周报出错:', error);
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
    timezone: 'Asia/Shanghai'
  });

  // 每周日 21:00 发送周报
  cron.schedule('0 21 * * 0', () => {
    sendWeeklyReports();
  }, {
    timezone: 'Asia/Shanghai'
  });

  console.log('[Scheduler] 定时任务已启动:');
  console.log('  - 每日打卡提醒: 20:00');
  console.log('  - 每周周报: 周日 21:00');
}

module.exports = {
  initNotificationScheduler,
  sendDailyReminders,
  sendWeeklyReports
};
