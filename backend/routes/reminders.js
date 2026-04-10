// ============================================
// 提醒事项路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User, Reminder } = require('../models');
const { getPushPayload } = require('../config/notifications');
const storageService = require('../services/storage');

const router = express.Router();

/**
 * @route   POST /api/reminders
 * @desc    创建提醒
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      title,
      description,
      remindAt,
      repeatType = 'once',
      repeatData = [],
      priority = 'normal'
    } = req.body;
    
    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: '请输入提醒内容'
      });
    }
    
    if (!remindAt) {
      return res.status(400).json({
        success: false,
        message: '请选择提醒时间'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    if (!user.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣才能使用此功能'
      });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const remindDate = new Date(remindAt);
    
    const reminder = new Reminder({
      creatorId: userId,
      coupleId,
      title: title.trim(),
      description: description?.trim() || '',
      remindAt: remindDate,
      repeatType,
      repeatData: Array.isArray(repeatData) ? repeatData : [],
      priority,
      nextRemindAt: remindDate
    });
    
    await reminder.save();
    
    // 通知情侣双方
    const broadcastToCouple = req.app.locals.broadcastToCouple;
    const sendNotification = req.app.locals.sendNotification;
    
    if (broadcastToCouple) {
      broadcastToCouple(coupleId, {
        type: 'reminderCreated',
        data: {
          reminderId: reminder._id,
          title: reminder.title
        }
      });
    }
    
    // 推送通知给伴侣
    if (sendNotification && user.partnerId) {
      const payload = getPushPayload('reminderCreated', {
        nickname: user.nickname,
        title: reminder.title
      }, { url: '/reminders' });
      sendNotification(user.partnerId, payload);
    }
    
    res.json({
      success: true,
      message: '添加成功',
      data: {
        id: reminder._id,
        title: reminder.title,
        description: reminder.description,
        remindAt: reminder.remindAt,
        repeatType: reminder.repeatType,
        repeatData: reminder.repeatData,
        priority: reminder.priority,
        status: reminder.status,
        createdAt: reminder.createdAt
      }
    });
  } catch (error) {
    console.error('[Reminder] 创建提醒出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   GET /api/reminders
 * @desc    获取提醒列表
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { status } = req.query;
    
    const user = await User.findById(userId);
    if (!user?.partnerId) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const query = { coupleId };
    
    if (status) {
      query.status = status;
    }
    
    const reminders = await Reminder.find(query)
      .sort({ remindAt: 1 });
    
    // 获取用户信息
    const userIds = [...new Set(
      reminders.map(r => r.creatorId)
        .concat(reminders.map(r => r.completedBy).filter(Boolean))
    )];
    
    const users = await User.find({ _id: { $in: userIds } });
    
    // 生成头像预签名 URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const userMap = {};
    await Promise.all(users.map(async (u) => {
      let avatarUrl = null;
      if (u.avatar) {
        avatarUrl = await storageService.getUrl(u.avatar, 86400, baseUrl);
      }
      userMap[u._id.toString()] = {
        id: u._id,
        nickname: u.nickname,
        avatar: u.avatar,
        avatarUrl
      };
    }));
    
    const result = reminders.map(r => ({
      id: r._id,
      title: r.title,
      description: r.description,
      remindAt: r.remindAt,
      repeatType: r.repeatType,
      repeatData: r.repeatData,
      priority: r.priority,
      status: r.status,
      completedAt: r.completedAt,
      creator: userMap[r.creatorId],
      completedBy: r.completedBy ? userMap[r.completedBy] : null,
      createdAt: r.createdAt
    }));
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Reminder] 获取提醒列表出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/reminders/:id/complete
 * @desc    完成提醒
 * @access  Private
 */
router.put('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const reminder = await Reminder.findById(req.params.id);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: '提醒不存在'
      });
    }
    
    const user = await User.findById(userId);
    if (!user || reminder.coupleId !== [userId, user.partnerId].sort().join('_')) {
      return res.status(403).json({
        success: false,
        message: '无权操作'
      });
    }
    
    if (reminder.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: '该提醒已完成'
      });
    }
    
    // 处理循环提醒
    if (reminder.repeatType !== 'once') {
      const nextDate = calculateNextRemindDate(reminder);
      if (nextDate) {
        reminder.nextRemindAt = nextDate;
        // 保持 pending 状态，不标记完成
      } else {
        // 没有下一次了，标记完成
        reminder.status = 'completed';
        reminder.completedAt = new Date();
        reminder.completedBy = userId;
      }
    } else {
      // 一次性提醒
      reminder.status = 'completed';
      reminder.completedAt = new Date();
      reminder.completedBy = userId;
    }
    
    await reminder.save();
    
    // 通知
    const broadcastToCouple = req.app.locals.broadcastToCouple;
    const sendNotification = req.app.locals.sendNotification;
    
    if (broadcastToCouple) {
      broadcastToCouple(reminder.coupleId, {
        type: 'reminderCompleted',
        data: {
          reminderId: reminder._id,
          title: reminder.title,
          completedBy: userId
        }
      });
    }
    
    // 推送通知给创建者（如果不是自己完成的）
    if (sendNotification && reminder.creatorId !== userId) {
      const payload = getPushPayload('reminderCompleted', {
        nickname: user.nickname,
        title: reminder.title
      }, { url: '/reminders' });
      sendNotification(reminder.creatorId, payload);
    }
    
    res.json({
      success: true,
      message: '完成成功',
      data: {
        id: reminder._id,
        status: reminder.status,
        completedAt: reminder.completedAt,
        nextRemindAt: reminder.nextRemindAt
      }
    });
  } catch (error) {
    console.error('[Reminder] 完成提醒出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/reminders/:id
 * @desc    编辑提醒
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      title,
      description,
      remindAt,
      repeatType,
      repeatData,
      priority
    } = req.body;
    
    const reminder = await Reminder.findById(req.params.id);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: '提醒不存在'
      });
    }
    
    if (reminder.creatorId !== userId) {
      return res.status(403).json({
        success: false,
        message: '只有创建者才能编辑'
      });
    }
    
    if (reminder.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: '已完成的提醒不能编辑'
      });
    }
    
    if (title !== undefined) reminder.title = title.trim();
    if (description !== undefined) reminder.description = description.trim();
    if (priority !== undefined) reminder.priority = priority;
    if (repeatType !== undefined) reminder.repeatType = repeatType;
    if (repeatData !== undefined) reminder.repeatData = Array.isArray(repeatData) ? repeatData : [];
    
    if (remindAt !== undefined) {
      const newRemindAt = new Date(remindAt);
      reminder.remindAt = newRemindAt;
      // 如果还未完成，更新下次提醒时间
      if (reminder.status === 'pending') {
        reminder.nextRemindAt = newRemindAt;
      }
    }
    
    reminder.updatedAt = new Date();
    await reminder.save();
    
    res.json({
      success: true,
      message: '修改成功',
      data: {
        id: reminder._id,
        title: reminder.title,
        description: reminder.description,
        remindAt: reminder.remindAt,
        repeatType: reminder.repeatType,
        repeatData: reminder.repeatData,
        priority: reminder.priority,
        status: reminder.status
      }
    });
  } catch (error) {
    console.error('[Reminder] 编辑提醒出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   DELETE /api/reminders/:id
 * @desc    删除提醒
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const reminder = await Reminder.findById(req.params.id);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: '提醒不存在'
      });
    }
    
    if (reminder.creatorId !== userId) {
      return res.status(403).json({
        success: false,
        message: '只有创建者才能删除'
      });
    }
    
    await Reminder.deleteOne({ _id: req.params.id });
    
    // 通知
    const broadcastToCouple = req.app.locals.broadcastToCouple;
    if (broadcastToCouple) {
      broadcastToCouple(reminder.coupleId, {
        type: 'reminderDeleted',
        data: {
          reminderId: reminder._id,
          title: reminder.title
        }
      });
    }
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('[Reminder] 删除提醒出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

// 计算下一次提醒时间
function calculateNextRemindDate(reminder) {
  const current = new Date(reminder.nextRemindAt || reminder.remindAt);
  const now = new Date();
  
  switch (reminder.repeatType) {
    case 'daily':
      current.setDate(current.getDate() + 1);
      return current > now ? current : null;
      
    case 'weekly': {
      // 找到下一个指定的星期几
      const targetDays = reminder.repeatData.length > 0 
        ? reminder.repeatData.sort((a, b) => a - b) 
        : [current.getDay() || 7];
      let daysToAdd = 1;
      const currentDay = current.getDay() || 7;
      
      while (daysToAdd <= 7) {
        const nextDay = ((currentDay - 1 + daysToAdd) % 7) + 1;
        if (targetDays.includes(nextDay)) {
          current.setDate(current.getDate() + daysToAdd);
          return current > now ? current : null;
        }
        daysToAdd++;
      }
      return null;
    }
      
    case 'monthly': {
      // 找到下一个指定的日期
      const targetDates = reminder.repeatData.length > 0 
        ? reminder.repeatData.sort((a, b) => a - b) 
        : [current.getDate()];
      let monthsToAdd = 0;
      
      while (monthsToAdd < 12) {
        current.setMonth(current.getMonth() + (monthsToAdd > 0 ? 1 : 0));
        const maxDate = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        
        for (const targetDate of targetDates) {
          const checkDate = monthsToAdd === 0 ? current.getDate() : 0;
          if (targetDate <= maxDate && targetDate > checkDate) {
            current.setDate(targetDate);
            return current > now ? current : null;
          }
        }
        monthsToAdd++;
      }
      return null;
    }
      
    default:
      return null;
  }
}

module.exports = router;
