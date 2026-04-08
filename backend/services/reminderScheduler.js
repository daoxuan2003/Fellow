// ============================================
// 定时任务服务
// 处理化妆品临期提醒和提醒事项到期通知
// ============================================

const cron = require('node-cron');
const { Cosmetic, Reminder } = require('../models');
const { getPushPayload } = require('../config/notifications');

class ReminderScheduler {
  constructor(app) {
    this.app = app;
    this.init();
  }
  
  init() {
    // 每天上午9点检查即将过期的化妆品
    cron.schedule('0 9 * * *', () => {
      console.log('[Scheduler] 开始检查化妆品保质期...');
      this.checkExpiringCosmetics();
    });
    
    // 每分钟检查到期的提醒事项
    cron.schedule('* * * * *', () => {
      this.checkDueReminders();
    });
    
    console.log('[Scheduler] 定时任务已启动');
  }
  
  // 检查即将过期的化妆品
  async checkExpiringCosmetics() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const cosmetics = await Cosmetic.find({
        status: 'active',
        reminderSent: false
      });
      
      const sendNotification = this.app.locals.sendNotification;
      const broadcastToCouple = this.app.locals.broadcastToCouple;
      
      for (const cosmetic of cosmetics) {
        const expire = new Date(cosmetic.expireDate);
        expire.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((expire - today) / (1000 * 60 * 60 * 24));
        
        // 临期提醒
        if (daysLeft <= cosmetic.remindDaysBefore && daysLeft > 0) {
          console.log(`[Scheduler] 化妆品 ${cosmetic.name} 即将过期，还剩 ${daysLeft} 天`);
          
          // WebSocket 通知
          if (broadcastToCouple) {
            broadcastToCouple(cosmetic.coupleId, {
              type: 'cosmeticExpiringSoon',
              data: {
                cosmeticId: cosmetic._id,
                name: cosmetic.name,
                daysLeft
              }
            });
          }
          
          // 推送通知给双方
          if (sendNotification) {
            const userIds = cosmetic.coupleId.split('_');
            const payload = getPushPayload('cosmeticExpiringSoon', {
              name: cosmetic.name,
              daysLeft
            }, { url: '/cosmetics' });
            
            for (const userId of userIds) {
              sendNotification(userId, payload);
            }
          }
          
          cosmetic.reminderSent = true;
          await cosmetic.save();
        }
        
        // 已过期，自动标记
        if (daysLeft < 0) {
          console.log(`[Scheduler] 化妆品 ${cosmetic.name} 已过期`);
          
          cosmetic.status = 'expired';
          await cosmetic.save();
          
          // WebSocket 通知
          if (broadcastToCouple) {
            broadcastToCouple(cosmetic.coupleId, {
              type: 'cosmeticExpired',
              data: {
                cosmeticId: cosmetic._id,
                name: cosmetic.name
              }
            });
          }
          
          // 推送通知
          if (sendNotification) {
            const userIds = cosmetic.coupleId.split('_');
            const payload = getPushPayload('cosmeticExpired', {
              name: cosmetic.name
            }, { url: '/cosmetics' });
            
            for (const userId of userIds) {
              sendNotification(userId, payload);
            }
          }
        }
      }
    } catch (error) {
      console.error('[Scheduler] 检查化妆品过期出错:', error);
    }
  }
  
  // 检查到期的提醒事项
  async checkDueReminders() {
    try {
      const now = new Date();
      
      const reminders = await Reminder.find({
        status: 'pending',
        nextRemindAt: { $lte: now }
      });
      
      const sendNotification = this.app.locals.sendNotification;
      const broadcastToCouple = this.app.locals.broadcastToCouple;
      
      for (const reminder of reminders) {
        console.log(`[Scheduler] 提醒事项到期: ${reminder.title}`);
        
        // WebSocket 广播给情侣双方
        if (broadcastToCouple) {
          broadcastToCouple(reminder.coupleId, {
            type: 'reminderDue',
            data: {
              reminderId: reminder._id,
              title: reminder.title,
              description: reminder.description
            }
          });
        }
        
        // 推送通知
        if (sendNotification) {
          const userIds = reminder.coupleId.split('_');
          const payload = getPushPayload('reminderDue', {
            title: reminder.title,
            description: reminder.description
          }, { url: '/reminders' });
          
          for (const userId of userIds) {
            sendNotification(userId, payload);
          }
        }
        
        // 一次性提醒标记为已触发（需要手动完成）
        // 循环提醒保持 pending，等待用户完成或下次触发
        if (reminder.repeatType === 'once') {
          // 可以选择标记为 archived 或保持 pending 让用户手动完成
          // 这里保持 pending，让用户看到后手动完成
        }
      }
    } catch (error) {
      console.error('[Scheduler] 检查提醒事项出错:', error);
    }
  }
}

module.exports = ReminderScheduler;
