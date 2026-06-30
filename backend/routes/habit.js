// ============================================
// 坚持计划路由
// ============================================

const express = require('express');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware');
const { User, Habit, CheckIn } = require('../models');
const { getPushPayload } = require('../config/notifications');
const { checkAchievements } = require('../services/achievementService');
const storageService = require('../services/storage');
const { formatDate, getTodayString } = require('../utils/helpers');
const { logError } = require('../utils/safeLogger');

const router = express.Router();

// 辅助函数：获取人称代词
const getPronoun = (gender) => {
  if (gender === 'male') return '他';
  if (gender === 'female') return '她';
  return 'TA';
};

// 辅助函数：统一发送习惯同步消息
function emitHabitSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;
  const { action, payload, actor, requestId } = options;
  broadcastToCouple(coupleId, {
    type: 'habitSync',
    data: { action, payload, actor, requestId: requestId || null, timestamp: Date.now() }
  });
}

// 辅助函数：统一发送成就同步消息
function emitAchievementSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;
  const { action, payload, actor, requestId } = options;
  broadcastToCouple(coupleId, {
    type: 'achievementSync',
    data: { action, payload, actor, requestId: requestId || null, timestamp: Date.now() }
  });
}

// 辅助函数：判断某天是否在请假期间
const isDateInLeaves = (dateStr, leaves = []) => {
  if (!leaves || leaves.length === 0) return false;
  return leaves.some(leave => dateStr >= leave.startDate && dateStr <= leave.endDate);
};

// 辅助函数：计算连续打卡天数
// 支持按任务频率计算（如周一三五的任务，周二没打不算断）
// 支持开始日期和请假跳过
const calculateStreak = (records, targetUserId, habitConfig = null, startDate = null, leaves = null) => {
  const userRecords = targetUserId ? records.filter(r => r.userId === targetUserId) : records;
  if (userRecords.length === 0) return 0;
  
  const completedDates = [...new Set(userRecords.map(r => r.date))].sort((a, b) => b.localeCompare(a));
  const leaveList = leaves || [];
  
  // 如果没有配置或每天打卡，按原来的逻辑
  if (!habitConfig || habitConfig.frequency === 'daily' || !habitConfig.weekdays?.length) {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = formatDate(checkDate);
      
      // 在开始日期之前，停止计算
      if (startDate && dateStr < startDate) break;
      
      // 请假期间跳过
      if (isDateInLeaves(dateStr, leaveList)) {
        continue;
      }
      
      if (completedDates.includes(dateStr)) {
        streak++;
      } else if (i > 0) {
        // 今天没打卡不中断，继续检查昨天（支持补卡不断签）
        break;
      }
    }
    return streak;
  }
  
  // 按任务频率计算连续
  const weekdays = habitConfig.weekdays.map(Number).sort((a, b) => b - a); // 降序
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayWeekday = today.getDay();
  
  let streak = 0;
  let checkDate = new Date(today);
  let dateIndex = 0; // completedDates 的索引
  
  // 检查今天
  let checkedToday = false;
  if (weekdays.includes(todayWeekday)) {
    const todayStr = formatDate(today);
    // 今天请假，跳过
    if (isDateInLeaves(todayStr, leaveList)) {
      checkedToday = true;
    } else if (dateIndex < completedDates.length && completedDates[dateIndex] === todayStr) {
      streak++;
      dateIndex++;
      checkedToday = true;
    }
  } else {
    checkedToday = true; // 今天不需要打卡
  }
  
  // 从昨天开始往前检查每一个应该打卡的日期
  let daysBack = 0;
  while (daysBack < 365) {
    checkDate.setDate(checkDate.getDate() - 1);
    daysBack++;
    const checkWeekday = checkDate.getDay();
    const dateStr = formatDate(checkDate);
    
    // 在开始日期之前，停止
    if (startDate && dateStr < startDate) break;
    
    // 检查这一天是否需要打卡
    if (!weekdays.includes(checkWeekday)) {
      continue; // 不需要打卡的日子，跳过
    }
    
    // 请假期间跳过（不断签但不加连续天数）
    if (isDateInLeaves(dateStr, leaveList)) {
      continue;
    }
    
    // 这一天需要打卡，检查是否完成了
    if (dateIndex < completedDates.length && completedDates[dateIndex] === dateStr) {
      streak++;
      dateIndex++;
    } else {
      break; // 未打卡，中断
    }
  }
  
  return streak;
};

/**
 * @route   GET /api/habits
 * @desc    获取所有习惯（含统计）
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
    const habits = await Habit.find({ coupleId, status: { $ne: 'completed' } }).sort({ createdAt: -1 });
    const todayStr = getTodayString();
    
    const habitsWithStats = await Promise.all(habits.map(async (habit) => {
      const checkIns = await CheckIn.find({ habitId: habit._id });
      const myCheckIns = checkIns.filter(c => c.userId === userId);
      const partnerCheckIns = checkIns.filter(c => c.userId === user.partnerId);
      
      let latestValue = null;
      if (habit.type === 'numeric' && habit.numericRecords && habit.numericRecords.length > 0) {
        latestValue = [...habit.numericRecords].sort((a, b) => b.date.localeCompare(a.date))[0].value;
      }
      
      return {
        ...habit.toObject(),
        stats: {
          selfChecked: myCheckIns.some(c => c.date === todayStr),
          partnerChecked: partnerCheckIns.some(c => c.date === todayStr),
          selfStreak: calculateStreak(myCheckIns, userId, { frequency: habit.frequency, weekdays: habit.weekdays }, habit.startDate, habit.leaves?.filter(l => l.userId === userId) || []),
          partnerStreak: calculateStreak(partnerCheckIns, user.partnerId, { frequency: habit.frequency, weekdays: habit.weekdays }, habit.startDate, habit.leaves?.filter(l => l.userId === user.partnerId) || []),
          latestValue
        }
      };
    }));
    
    res.json({ success: true, data: habitsWithStats });
  } catch (error) {
    logError('获取习惯列表出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   POST /api/habits
 * @desc    创建习惯
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { title, description, icon, color, type, participation, targetDays, frequency, weekdays, subTasks, numericConfig, startDate } = req.body;
    
    if (!title) {
      return res.status(400).json({ success: false, message: '标题不能为空' });
    }
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const habit = new Habit({
      coupleId,
      createdBy: userId,
      title,
      description: description || '',
      icon: icon || '☀️',
      color: color || '#EC4899',
      type: type || 'simple',
      participation: participation || 'both',
      targetDays: targetDays || 30,
      frequency: frequency || 'daily',
      weekdays: weekdays || [],
      subTasks: subTasks || [],
      numericConfig: numericConfig || { unit: '', targetValue: 0, lowerIsBetter: false },
      startDate: startDate || getTodayString(),
      leaves: [],
      reminderTime: req.body.reminderTime || null,
      reminderEnabled: req.body.reminderEnabled === true || false
    });
    
    await habit.save();
    
    // 通知情侣双方新计划创建
    const sendNotification = req.app.locals.sendNotification;
    
    emitHabitSync(req.app, coupleId, {
      action: 'create',
      payload: {
        id: habit._id,
        title: habit.title,
        description: habit.description,
        icon: habit.icon,
        color: habit.color,
        type: habit.type,
        participation: habit.participation,
        targetDays: habit.targetDays,
        frequency: habit.frequency,
        weekdays: habit.weekdays,
        subTasks: habit.subTasks,
        numericConfig: habit.numericConfig,
        startDate: habit.startDate,
        createdBy: habit.createdBy,
        createdAt: habit.createdAt
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    // 推送通知只发给伴侣
    if (sendNotification && user.partnerId) {
      const pronoun = getPronoun(user.gender);
      const payload = getPushPayload('habitCreated', {
        nickname: user.nickname,
        pronoun,
        habitTitle: habit.title
      }, { url: '/plans' });
      sendNotification(user.partnerId, payload);
    }
    
    res.json({ success: true, message: '习惯创建成功', data: habit });
  } catch (error) {
    logError('创建习惯出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   PUT /api/habits/:id
 * @desc    更新习惯
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const updateData = req.body;
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    
    const existingHabit = await Habit.findOne({ _id: req.params.id, coupleId });
    if (!existingHabit) {
      return res.status(404).json({ success: false, message: '习惯不存在' });
    }
    if (String(existingHabit.createdBy) !== String(userId)) {
      return res.status(403).json({ success: false, message: '只有创建者可以修改计划' });
    }

    // 构建更新数据；请假记录只能通过专用 leave 接口维护
    const allowedFields = ['title', 'description', 'icon', 'color', 'targetDays', 'subTasks', 'numericConfig', 'status', 'startDate', 'reminderTime', 'reminderEnabled'];
    const updateFields = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) updateFields[field] = updateData[field];
    });
    updateFields.updatedAt = new Date();
    
    // 使用 findOneAndUpdate 避免版本冲突问题
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, coupleId, createdBy: userId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    
    if (!habit) {
      return res.status(404).json({ success: false, message: '习惯不存在' });
    }
    
    // 通知情侣双方计划已更新
    const sendNotification = req.app.locals.sendNotification;
    
    emitHabitSync(req.app, coupleId, {
      action: 'update',
      payload: {
        id: habit._id,
        title: habit.title,
        description: habit.description,
        icon: habit.icon,
        color: habit.color,
        targetDays: habit.targetDays,
        subTasks: habit.subTasks,
        numericConfig: habit.numericConfig,
        status: habit.status,
        startDate: habit.startDate,
        updatedAt: habit.updatedAt
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    // 推送通知只发给伴侣
    if (sendNotification && user.partnerId) {
      const pronoun = getPronoun(user.gender);
      const payload = getPushPayload('habitEdited', {
        nickname: user.nickname,
        pronoun,
        habitTitle: habit.title
      }, { url: '/plans' });
      sendNotification(user.partnerId, payload);
    }
    
    res.json({ success: true, message: '更新成功', data: habit });
  } catch (error) {
    logError('更新习惯出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   DELETE /api/habits/:id
 * @desc    删除习惯
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const existingHabit = await Habit.findOne({ _id: req.params.id, coupleId });

    if (!existingHabit) {
      return res.status(404).json({ success: false, message: '习惯不存在' });
    }

    if (String(existingHabit.createdBy) !== String(userId)) {
      return res.status(403).json({ success: false, message: '只有创建者可以删除计划' });
    }
    
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, coupleId, createdBy: userId });
    if (!habit) {
      return res.status(404).json({ success: false, message: '习惯不存在' });
    }
    
    await CheckIn.deleteMany({ habitId: req.params.id });
    
    // 通知情侣双方计划被删除
    const sendNotification = req.app.locals.sendNotification;
    
    emitHabitSync(req.app, coupleId, {
      action: 'delete',
      payload: { id: habit._id, title: habit.title },
      actor: userId,
      requestId: req.body.requestId
    });
    
    // 推送通知只发给伴侣
    if (sendNotification && user.partnerId) {
      const pronoun = getPronoun(user.gender);
      const payload = getPushPayload('habitDeleted', {
        nickname: user.nickname,
        pronoun,
        habitTitle: habit.title
      }, { url: '/plans' });
      sendNotification(user.partnerId, payload);
    }
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    logError('删除习惯出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   POST /api/habits/:id/checkin
 * @desc    打卡
 * @access  Private
 */
router.post('/:id/checkin', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { date, mood, note, completedSubTasks, numericValue, isPerfect } = req.body;
    
    if (!date) {
      return res.status(400).json({ success: false, message: '打卡日期不能为空' });
    }
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const habit = await Habit.findOne({ _id: req.params.id, coupleId });
    
    if (!habit) {
      return res.status(404).json({ success: false, message: '习惯不存在' });
    }
    
    if (habit.participation === 'self' && habit.createdBy !== userId) {
      return res.status(403).json({ success: false, message: '只有创建者可以打卡' });
    }
    if (habit.participation === 'partner' && habit.createdBy === userId) {
      return res.status(403).json({ success: false, message: '只有伴侣可以打卡' });
    }
    
    // 使用原子操作 upsert，避免并发重复插入
    let isUpdate = false;
    let checkIn;
    
    // 先检查是否已存在（用于返回 isUpdate 标记）
    const existingCheckIn = await CheckIn.findOne({ habitId: req.params.id, userId, date }).lean();
    isUpdate = !!existingCheckIn;
    
    const updateDoc = {
      $setOnInsert: {
        habitId: req.params.id,
        userId,
        coupleId,
        date
      },
      $set: {
        mood: mood || 'happy',
        note: note || '',
        updatedAt: new Date()
      }
    };
    
    if (numericValue !== undefined && numericValue !== null) {
      updateDoc.$set.numericValue = numericValue;
    }
    
    // 重新计算是否完美打卡
    let perfectFlag = isPerfect || false;
    if (habit.type === 'subtasks' && habit.subTasks) {
      const allSubTaskIds = habit.subTasks.map(st => st._id?.toString?.() || st.id?.toString?.() || st.toString?.());
      const completedIds = (completedSubTasks || []).map(id => id.toString?.() || id);
      perfectFlag = allSubTaskIds.every(id => completedIds.includes(id));
    }
    updateDoc.$set.isPerfect = perfectFlag;
    
    // 子任务：总是覆盖为最新提交（追加打卡模式）
    if (completedSubTasks !== undefined) {
      updateDoc.$set.completedSubTasks = completedSubTasks;
    }
    
    try {
      checkIn = await CheckIn.findOneAndUpdate(
        { habitId: req.params.id, userId, date },
        updateDoc,
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      if (err.code === 11000) {
        // 并发唯一索引冲突：回退到查询+更新
        checkIn = await CheckIn.findOne({ habitId: req.params.id, userId, date });
        if (checkIn) {
          checkIn.completedSubTasks = completedSubTasks || checkIn.completedSubTasks || [];
          checkIn.note = note || checkIn.note || '';
          checkIn.mood = mood || checkIn.mood || 'happy';
          if (numericValue !== undefined && numericValue !== null) {
            checkIn.numericValue = numericValue;
          }
          let perfectFlag2 = isPerfect || false;
          if (habit.type === 'subtasks' && habit.subTasks) {
            const allSubTaskIds = habit.subTasks.map(st => st._id?.toString?.() || st.id?.toString?.() || st.toString?.());
            const completedIds = (completedSubTasks || []).map(id => id.toString?.() || id);
            perfectFlag2 = allSubTaskIds.every(id => completedIds.includes(id));
          }
          checkIn.isPerfect = perfectFlag2;
          checkIn.updatedAt = new Date();
          await checkIn.save();
          isUpdate = true;
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }
    
    if (habit.type === 'numeric' && numericValue !== undefined && numericValue !== null) {
      const existingIndex = habit.numericRecords.findIndex(r => r.date === date && r.userId === userId);
      if (existingIndex >= 0) {
        habit.numericRecords[existingIndex].value = numericValue;
        habit.numericRecords[existingIndex].note = note || '';
      } else {
        habit.numericRecords.push({ date, value: numericValue, userId, note: note || '' });
      }
      await habit.save();
    }
    
    // 发送通知给情侣双方（仅双人任务或对方需要关注的任务才通知）
    const sendNotification = req.app.locals.sendNotification;
    
    // 判断是否应该通知对方
    // - both: 双方都需要知道
    // - self: 只有创建者可以打卡，对方不需要被通知
    // - partner: 只有对方可以打卡，当前用户打卡时对方需要知道
    const shouldNotifyPartner = habit.participation === 'both' || 
                                (habit.participation === 'partner' && habit.createdBy === userId);
    
    // 检查是否双方都完成了（双人任务）
    const partnerCheckIn = await CheckIn.findOne({ 
      habitId: req.params.id, 
      userId: user.partnerId, 
      date 
    });
    const isBothComplete = habit.participation === 'both' && partnerCheckIn;
    
    // 获取当前完成的子任务信息
    const completedSubTaskIds = completedSubTasks || [];
    const justCompletedTasks = [];
    
    // 如果是更新，找出新完成的子任务
    if (isUpdate && habit.type === 'subtasks' && habit.subTasks) {
      // 获取之前的打卡记录
      const previousCheckIn = await CheckIn.findOne({ 
        habitId: req.params.id, 
        userId, 
        date 
      });
      const previousCompleted = previousCheckIn?.completedSubTasks || [];
      
      // 找出新完成的子任务
      for (const taskId of completedSubTaskIds) {
        if (!previousCompleted.includes(taskId)) {
          const task = habit.subTasks.find(st => 
            (st._id?.toString() === taskId) || (st.id?.toString() === taskId)
          );
          if (task) {
            justCompletedTasks.push({ id: taskId, title: task.title });
          }
        }
      }
    } else if (!isUpdate && habit.type === 'subtasks' && habit.subTasks) {
      // 首次打卡，所有完成的都是新完成的
      for (const taskId of completedSubTaskIds) {
        const task = habit.subTasks.find(st => 
          (st._id?.toString() === taskId) || (st.id?.toString() === taskId)
        );
        if (task) {
          justCompletedTasks.push({ id: taskId, title: task.title });
        }
      }
    }
    
    emitHabitSync(req.app, coupleId, {
      action: 'checkin',
      payload: {
        habitId: habit._id,
        checkInId: checkIn._id,
        userId,
        date,
        isPerfect: checkIn.isPerfect,
        completedSubTasks: checkIn.completedSubTasks,
        numericValue: checkIn.numericValue,
        mood: checkIn.mood,
        note: checkIn.note,
        isUpdate,
        isBothComplete
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    // 推送通知只发给伴侣（如果需要）
    if (shouldNotifyPartner && sendNotification && user.partnerId) {
      const pronoun = getPronoun(user.gender);
      
      // 发送子任务完成通知
      if (justCompletedTasks.length > 0) {
        for (const task of justCompletedTasks) {
          const payload = getPushPayload('habitSubTaskComplete', {
            nickname: user.nickname,
            pronoun,
            taskTitle: task.title,
            habitTitle: habit.title,
            completedCount: completedSubTaskIds.length,
            totalCount: habit.subTasks.length
          }, { url: '/plans' });
          
          sendNotification(user.partnerId, payload);
        }
      }
      
      // 推送通知（总结性的）
      if (sendNotification) {
        if (isBothComplete) {
          // 双方都完成了
          const payload = getPushPayload('habitBothComplete', {
            habitTitle: habit.title
          }, { url: '/plans' });
          sendNotification(user.partnerId, payload);
        } else if (checkIn.isPerfect && justCompletedTasks.length === 0) {
          // 完美打卡（但不是这次新完成的，可能是之前就已经完成了）
          const payload = getPushPayload('habitPerfectCheckIn', {
            nickname: user.nickname,
            pronoun,
            habitTitle: habit.title
          }, { url: '/plans' });
          sendNotification(user.partnerId, payload);
        }
      }
    }
    
    // 异步检查成就（不阻塞响应）
    try {
      const { newUnlocks } = await checkAchievements(userId, coupleId);
      if (newUnlocks.length > 0) {
        emitAchievementSync(req.app, coupleId, {
          action: 'unlock',
          payload: {
            achievements: newUnlocks.map(a => ({ id: a.id, title: a.title, icon: a.icon }))
          },
          actor: userId,
          requestId: null
        });
      }
    } catch (e) {
      logError('打卡后检查成就失败:', e);
    }
    
    res.json({ success: true, message: isUpdate ? '更新打卡成功' : '打卡成功', data: checkIn, isUpdate });
  } catch (error) {
    logError('打卡出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   GET /api/habits/:id/checkins
 * @desc    获取某个习惯的所有打卡记录
 * @access  Private
 */
router.get('/:id/checkins', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const habit = await Habit.findOne({ _id: req.params.id, coupleId });
    
    if (!habit) {
      return res.status(404).json({ success: false, message: '习惯不存在' });
    }
    
    const checkIns = await CheckIn.find({ habitId: req.params.id, coupleId }).sort({ date: -1 });
    const userIds = [...new Set(checkIns.map(c => c.userId))];
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
    
    const result = checkIns.map(c => ({ ...c.toObject(), user: userMap[c.userId] || null }));
    res.json({ success: true, data: result });
  } catch (error) {
    logError('获取打卡记录出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   GET /api/habits/today
 * @desc    获取今日打卡状态
 * @access  Private
 */
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user || !user.partnerId) {
      return res.json({ success: true, data: { checkedInHabits: [], pendingHabits: [] } });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const habits = await Habit.find({ coupleId, status: 'active' });
    
    // 使用本地时间获取今天的日期字符串（避免 UTC 时差问题）
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const todayCheckIns = await CheckIn.find({ coupleId, date: todayStr });
    
    const habitsWithStatus = habits.map(habit => {
      const myChecked = todayCheckIns.some(c => c.habitId.toString() === habit._id.toString() && c.userId === userId);
      const partnerChecked = todayCheckIns.some(c => c.habitId.toString() === habit._id.toString() && c.userId === user.partnerId);
      return { ...habit.toObject(), myChecked, partnerChecked };
    });
    
    const checkedInHabits = habitsWithStatus.filter(h => h.myChecked);
    const pendingHabits = habitsWithStatus.filter(h => !h.myChecked);
    
    res.json({ success: true, data: { checkedInHabits, pendingHabits } });
  } catch (error) {
    logError('获取今日打卡状态出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   GET /api/habits/stats
 * @desc    获取统计概览
 * @access  Private
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user || !user.partnerId) {
      return res.json({
        success: true,
        data: {
          myStats: { totalHabits: 0, totalCheckIns: 0, currentStreak: 0 },
          partnerStats: { totalCheckIns: 0, currentStreak: 0 }
        }
      });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const myHabits = await Habit.find({ coupleId, createdBy: userId });
    const myCheckIns = await CheckIn.find({ coupleId, userId });
    const partnerCheckIns = await CheckIn.find({ coupleId, userId: user.partnerId });
    
    res.json({
      success: true,
      data: {
        myStats: { totalHabits: myHabits.length, totalCheckIns: myCheckIns.length, currentStreak: calculateStreak(myCheckIns, null, null) },
        partnerStats: { totalCheckIns: partnerCheckIns.length, currentStreak: calculateStreak(partnerCheckIns, null, null) }
      }
    });
  } catch (error) {
    logError('获取统计数据出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   POST /api/habits/:id/complete
 * @desc    完成计划（归档）
 * @access  Private
 */
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const existingHabit = await Habit.findOne({ _id: req.params.id, coupleId });

    if (!existingHabit) {
      return res.status(404).json({ success: false, message: '计划不存在' });
    }

    if (String(existingHabit.createdBy) !== String(userId)) {
      return res.status(403).json({ success: false, message: '只有创建者可以完成计划' });
    }

    if (existingHabit.status === 'completed') {
      return res.status(400).json({ success: false, message: '计划已完成' });
    }

    const completedAt = new Date();
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, coupleId, createdBy: userId, status: { $ne: 'completed' } },
      { $set: { status: 'completed', completedAt, completedBy: userId, updatedAt: completedAt } },
      { new: true, runValidators: true }
    );

    if (!habit) {
      return res.status(400).json({ success: false, message: '计划已完成' });
    }

    // 通知情侣双方计划完成
    const sendNotification = req.app.locals.sendNotification;
    
    emitHabitSync(req.app, coupleId, {
      action: 'archive',
      payload: {
        id: habit._id,
        title: habit.title,
        status: habit.status,
        completedAt: habit.completedAt,
        completedBy: habit.completedBy
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    // 推送通知只发给伴侣
    if (sendNotification && user.partnerId) {
      const pronoun = getPronoun(user.gender);
      const payload = getPushPayload('habitCompleted', {
        nickname: user.nickname,
        pronoun,
        habitTitle: habit.title,
        participation: habit.participation
      }, { url: '/plans' });
      sendNotification(user.partnerId, payload);
    }
    
    // 异步检查成就
    try {
      await checkAchievements(userId, coupleId);
    } catch (e) {
      logError('完成计划后检查成就失败:', e);
    }
    
    res.json({ success: true, message: '计划已完成', data: habit });
  } catch (error) {
    logError('完成计划出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   GET /api/habits/weekly-report
 * @desc    获取本周打卡报告
 * @access  Private
 */
router.get('/weekly-report', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user || !user.partnerId) {
      return res.json({ success: true, data: null });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    
    // 获取本周一和今天
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    monday.setHours(0, 0, 0, 0);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(formatDate(d));
    }
    
    // 获取本周打卡记录
    const checkIns = await CheckIn.find({
      coupleId,
      date: { $in: weekDates }
    });
    
    // 统计每天完成情况
    const dailyStats = weekDates.map(date => {
      const myCheckIns = checkIns.filter(c => c.date === date && c.userId === userId);
      const partnerCheckIns = checkIns.filter(c => c.date === date && c.userId === user.partnerId);
      
      return {
        date,
        dayOfWeek: new Date(date).getDay(),
        myCompleted: myCheckIns.length,
        partnerCompleted: partnerCheckIns.length
      };
    });
    
    // 统计本周总计
    const myTotal = dailyStats.filter(d => d.myCompleted > 0).length;
    const partnerTotal = dailyStats.filter(d => d.partnerCompleted > 0).length;
    const bothCompleted = dailyStats.filter(d => d.myCompleted > 0 && d.partnerCompleted > 0).length;
    
    // 获取当前习惯列表
    const habits = await Habit.find({ coupleId, status: 'active' });
    
    res.json({
      success: true,
      data: {
        weekDates,
        dailyStats,
        summary: {
          myTotal,
          partnerTotal,
          bothCompleted,
          totalDays: weekDates.length
        },
        habits: habits.map(h => ({
          id: h._id,
          title: h.title,
          icon: h.icon
        }))
      }
    });
  } catch (error) {
    logError('获取周报出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   PUT /api/habits/notification-settings
 * @desc    更新通知设置
 * @access  Private
 */
router.put('/notification-settings', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { weeklyReport, dailyReminder, partnerActivity } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 更新设置
    if (!user.notificationSettings) {
      user.notificationSettings = {};
    }
    if (weeklyReport !== undefined) user.notificationSettings.weeklyReport = weeklyReport;
    if (dailyReminder !== undefined) user.notificationSettings.dailyReminder = dailyReminder;
    if (partnerActivity !== undefined) user.notificationSettings.partnerActivity = partnerActivity;
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: '设置已更新',
      data: user.notificationSettings
    });
  } catch (error) {
    logError('更新通知设置出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   POST /api/habits/:id/leave
 * @desc    添加请假记录
 * @access  Private
 */
router.post('/:id/leave', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { startDate, endDate, reason } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: '请假开始和结束日期不能为空' });
    }
    
    if (startDate > endDate) {
      return res.status(400).json({ success: false, message: '开始日期不能晚于结束日期' });
    }
    
    const todayStr = getTodayString();
    
    // 1. 不能事后请假
    if (startDate < todayStr) {
      return res.status(400).json({ success: false, message: '不能请过去的假哦，坚持就是胜利 💪' });
    }
    
    // 2. 单次请假最多2天
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 2) {
      return res.status(400).json({ success: false, message: '单次请假最多2天' });
    }
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const habit = await Habit.findOne({ _id: req.params.id, coupleId });
    
    if (!habit) {
      return res.status(404).json({ success: false, message: '计划不存在' });
    }
    
    // 检查请假权限
    if (habit.participation === 'self' && habit.createdBy !== userId) {
      return res.status(403).json({ success: false, message: '只有创建者可以请假' });
    }
    if (habit.participation === 'partner' && habit.createdBy === userId) {
      return res.status(403).json({ success: false, message: '只有对方可以请假' });
    }
    
    habit.leaves = habit.leaves || [];
    const myLeaves = habit.leaves.filter(l => l.userId === userId);
    
    // 3. 不能与已有请假重叠（仅检测自己的）
    const hasOverlap = myLeaves.some(leave => {
      return startDate <= leave.endDate && endDate >= leave.startDate;
    });
    if (hasOverlap) {
      return res.status(400).json({ success: false, message: '该时间段你已有请假记录' });
    }
    
    // 4. 每月最多请假2次（仅统计自己的）
    const currentMonth = todayStr.slice(0, 7); // "2026-04"
    const monthlyLeaves = myLeaves.filter(leave => leave.startDate.startsWith(currentMonth));
    if (monthlyLeaves.length >= 2) {
      return res.status(400).json({ success: false, message: '本月请假次数已达上限（2次）' });
    }
    
    habit.leaves.push({ id: crypto.randomUUID(), userId, startDate, endDate, reason: reason || '' });
    habit.leaves.sort((a, b) => a.startDate.localeCompare(b.startDate));
    habit.updatedAt = new Date();
    await habit.save();
    
    emitHabitSync(req.app, coupleId, {
      action: 'leave',
      payload: {
        id: habit._id,
        title: habit.title,
        leaves: habit.leaves
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    res.json({ success: true, message: '请假申请已提交', data: habit });
  } catch (error) {
    logError('添加请假出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   DELETE /api/habits/:id/leave/:leaveId
 * @desc    删除自己的请假记录
 * @access  Private
 */
router.delete('/:id/leave/:leaveId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { leaveId } = req.params;
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const habit = await Habit.findOne({ _id: req.params.id, coupleId });
    
    if (!habit) {
      return res.status(404).json({ success: false, message: '计划不存在' });
    }
    
    const leaveIndex = habit.leaves.findIndex(l => l.id === leaveId && l.userId === userId);
    if (leaveIndex === -1) {
      return res.status(404).json({ success: false, message: '请假记录不存在或无权限删除' });
    }
    
    habit.leaves.splice(leaveIndex, 1);
    habit.updatedAt = new Date();
    await habit.save();
    
    emitHabitSync(req.app, coupleId, {
      action: 'unleave',
      payload: {
        id: habit._id,
        title: habit.title,
        leaves: habit.leaves
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    res.json({ success: true, message: '请假记录已删除', data: habit });
  } catch (error) {
    logError('删除请假出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

module.exports = router;
