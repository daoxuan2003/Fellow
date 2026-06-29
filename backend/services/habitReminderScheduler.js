// ============================================
// 习惯打卡提醒调度器
// 每个习惯支持自定义提醒时间，到点推送通知
// ============================================

const cron = require('node-cron');
const { Habit, CheckIn } = require('../models');
const { getPushPayload } = require('../config/notifications');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const debugLog = (...args) => {
  if (!IS_PRODUCTION) console.log(...args);
};

class HabitReminderScheduler {
  constructor(app) {
    this.app = app;
    this.init();
  }

  init() {
    // 每分钟检查一次是否有习惯需要提醒
    cron.schedule('* * * * *', () => {
      this.checkHabitReminders();
    }, {
      name: 'habit-minute-reminders',
      timezone: 'Asia/Shanghai',
      noOverlap: true
    });

    console.log('[Scheduler] 习惯提醒定时任务已启动');
  }

  async checkHabitReminders() {
    try {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const todayWeekday = now.getDay(); // 0=周日, 1=周一...

      // 查找启用了提醒且时间匹配的习惯
      const habits = await Habit.find({
        status: 'active',
        reminderEnabled: true,
        reminderTime: currentTime
      });

      if (habits.length === 0) return;

      const sendNotification = this.app.locals.sendNotification;
      const broadcastToCouple = this.app.locals.broadcastToCouple;

      for (const habit of habits) {
        // 检查今天是否需要打卡（频率判断）
        if (habit.frequency === 'weekly' && habit.weekdays?.length > 0) {
          if (!habit.weekdays.includes(todayWeekday)) {
            continue; // 今天不需要打卡
          }
        }

        // 检查今天是否已经打卡
        const checkedUsers = await CheckIn.find({
          habitId: habit._id,
          date: todayStr
        }).select('userId');

        const checkedUserIds = new Set(checkedUsers.map(c => c.userId));
        const coupleIds = habit.coupleId.split('_');

        // 确定谁需要被提醒
        const usersToRemind = [];
        for (const userId of coupleIds) {
          // 根据参与模式判断谁需要打卡
          let needCheckIn = false;
          if (habit.participation === 'both') {
            needCheckIn = !checkedUserIds.has(userId);
          } else if (habit.participation === 'self') {
            needCheckIn = userId === habit.createdBy && !checkedUserIds.has(userId);
          } else if (habit.participation === 'partner') {
            needCheckIn = userId !== habit.createdBy && !checkedUserIds.has(userId);
          }

          if (needCheckIn) {
            usersToRemind.push(userId);
          }
        }

        if (usersToRemind.length === 0) continue;

        debugLog(`[HabitReminder] 提醒习惯 ${habit._id}，${usersToRemind.length} 人未打卡`);

        // WebSocket 广播给情侣双方
        if (broadcastToCouple) {
          broadcastToCouple(habit.coupleId, {
            type: 'habitReminder',
            data: {
              habitId: habit._id,
              habitTitle: habit.title,
              icon: habit.icon,
              usersToRemind,
              reminderTime: currentTime
            }
          });
        }

        // Push 通知给未打卡的人
        if (sendNotification) {
          for (const userId of usersToRemind) {
            const payload = getPushPayload('habitReminder', {
              habitTitle: habit.title,
              icon: habit.icon
            }, { url: '/plans' });
            sendNotification(userId, payload);
          }
        }
      }
    } catch (error) {
      console.error('[HabitReminder] 检查习惯提醒出错:', error);
    }
  }
}

module.exports = HabitReminderScheduler;
