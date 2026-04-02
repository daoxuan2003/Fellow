// ============================================
// 坚持计划路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User, Habit, CheckIn } = require('../models');
const { getPushPayload } = require('../config/notifications');

const router = express.Router();

// 辅助函数：获取人称代词
const getPronoun = (gender) => {
  if (gender === 'male') return '他';
  if (gender === 'female') return '她';
  return 'TA';
};

// 辅助函数：计算连续打卡天数
// 支持按任务频率计算（如周一三五的任务，周二没打不算断）
const calculateStreak = (records, targetUserId, habitConfig = null) => {
  const userRecords = targetUserId ? records.filter(r => r.userId === targetUserId) : records;
  if (userRecords.length === 0) return 0;
  
  const completedDates = [...new Set(userRecords.map(r => r.date))].sort((a, b) => b.localeCompare(a));
  
  // 如果没有配置或每天打卡，按原来的逻辑
  if (!habitConfig || habitConfig.frequency === 'daily' || !habitConfig.weekdays?.length) {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const dateStr of completedDates) {
      const recordDate = new Date(dateStr);
      recordDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - recordDate) / (1000 * 60 * 60 * 24));
      if (diffDays === streak) streak++;
      else if (diffDays > streak) break;
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
  
  // 从昨天开始往前检查每一个应该打卡的日期
  while (true) {
    checkDate.setDate(checkDate.getDate() - 1);
    const checkWeekday = checkDate.getDay();
    const dateStr = checkDate.toISOString().split('T')[0];
    
    // 检查这一天是否需要打卡
    if (!weekdays.includes(checkWeekday)) {
      continue; // 不需要打卡的日子，跳过
    }
    
    // 这一天需要打卡，检查是否完成了
    if (dateIndex < completedDates.length && completedDates[dateIndex] === dateStr) {
      streak++;
      dateIndex++;
    } else {
      break; // 有打卡记录但未完成，中断
    }
  }
  
  // 检查今天是否需要打卡且已完成
  if (weekdays.includes(todayWeekday)) {
    const todayStr = today.toISOString().split('T')[0];
    if (dateIndex < completedDates.length && completedDates[dateIndex] === todayStr) {
      streak++;
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
    const todayStr = new Date().toISOString().split('T')[0];
    
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
          selfStreak: calculateStreak(myCheckIns, userId, { frequency: habit.frequency, weekdays: habit.weekdays }),
          partnerStreak: calculateStreak(partnerCheckIns, user.partnerId, { frequency: habit.frequency, weekdays: habit.weekdays }),
          latestValue
        }
      };
    }));
    
    res.json({ success: true, data: habitsWithStats });
  } catch (error) {
    console.log('获取习惯列表出错：', error);
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
    const { title, description, icon, color, type, participation, targetDays, frequency, weekdays, subTasks, numericConfig } = req.body;
    
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
      numericConfig: numericConfig || { unit: '', targetValue: 0, lowerIsBetter: false }
    });
    
    await habit.save();
    
    // 通知伴侣新计划创建
    const notifyPartner = req.app.locals.notifyPartner;
    const sendNotification = req.app.locals.sendNotification;
    if (notifyPartner && user.partnerId) {
      const pronoun = getPronoun(user.gender);
      
      notifyPartner(user.partnerId, {
        type: 'habitCreated',
        data: {
          habitId: habit._id,
          habitTitle: habit.title,
          userName: user.nickname || '我',
          userGender: user.gender
        }
      });
      
      if (sendNotification) {
        const payload = getPushPayload('habitCreated', {
          nickname: user.nickname,
          pronoun,
          habitTitle: habit.title
        }, { url: '/plans' });
        sendNotification(user.partnerId, payload);
      }
    }
    
    res.json({ success: true, message: '习惯创建成功', data: habit });
  } catch (error) {
    console.log('创建习惯出错：', error);
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
    
    // 构建更新数据
    const allowedFields = ['title', 'description', 'icon', 'color', 'targetDays', 'subTasks', 'numericConfig', 'status'];
    const updateFields = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) updateFields[field] = updateData[field];
    });
    updateFields.updatedAt = new Date();
    
    // 使用 findOneAndUpdate 避免版本冲突问题
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, coupleId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    
    if (!habit) {
      return res.status(404).json({ success: false, message: '习惯不存在' });
    }
    
    // 通知伴侣计划已更新
    const notifyPartner = req.app.locals.notifyPartner;
    const sendNotification = req.app.locals.sendNotification;
    if (notifyPartner && user.partnerId) {
      const pronoun = getPronoun(user.gender);
      
      notifyPartner(user.partnerId, {
        type: 'habitEdited',
        data: {
          habitId: habit._id,
          habitTitle: habit.title,
          userName: user.nickname || '我',
          userGender: user.gender
        }
      });
      
      if (sendNotification) {
        const payload = getPushPayload('habitEdited', {
          nickname: user.nickname,
          pronoun,
          habitTitle: habit.title
        }, { url: '/plans' });
        sendNotification(user.partnerId, payload);
      }
    }
    
    res.json({ success: true, message: '更新成功', data: habit });
  } catch (error) {
    console.log('更新习惯出错：', error);
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
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, coupleId });
    
    if (!habit) {
      return res.status(404).json({ success: false, message: '习惯不存在' });
    }
    
    await CheckIn.deleteMany({ habitId: req.params.id });
    
    // 通知伴侣计划被删除
    const notifyPartner = req.app.locals.notifyPartner;
    const sendNotification = req.app.locals.sendNotification;
    if (notifyPartner && user.partnerId) {
      const pronoun = getPronoun(user.gender);
      
      notifyPartner(user.partnerId, {
        type: 'habitDeleted',
        data: {
          habitTitle: habit.title,
          userName: user.nickname || '我',
          userGender: user.gender
        }
      });
      
      if (sendNotification) {
        const payload = getPushPayload('habitDeleted', {
          nickname: user.nickname,
          pronoun,
          habitTitle: habit.title
        }, { url: '/plans' });
        sendNotification(user.partnerId, payload);
      }
    }
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.log('删除习惯出错：', error);
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
    
    let checkIn = await CheckIn.findOne({ habitId: req.params.id, userId, date });
    let isUpdate = false;
    
    if (checkIn) {
      // 更新现有打卡记录（追加打卡模式）
      checkIn.completedSubTasks = completedSubTasks || checkIn.completedSubTasks || [];
      checkIn.note = note || checkIn.note || '';
      checkIn.mood = mood || checkIn.mood || 'happy';
      if (numericValue !== undefined && numericValue !== null) {
        checkIn.numericValue = numericValue;
      }
      // 重新计算是否完美打卡
      if (habit.type === 'subtasks' && habit.subTasks) {
        const allSubTaskIds = habit.subTasks.map(st => st._id?.toString?.() || st.id?.toString?.() || st.toString?.());
        const completedIds = (completedSubTasks || []).map(id => id.toString?.() || id);
        checkIn.isPerfect = allSubTaskIds.every(id => completedIds.includes(id));
      } else {
        checkIn.isPerfect = isPerfect || checkIn.isPerfect || false;
      }
      checkIn.updatedAt = new Date();
      await checkIn.save();
      isUpdate = true;
    } else {
      // 新增打卡记录
      checkIn = new CheckIn({
        habitId: req.params.id,
        userId,
        coupleId,
        date,
        mood: mood || 'happy',
        note: note || '',
        completedSubTasks: completedSubTasks || [],
        numericValue: numericValue !== undefined && numericValue !== null ? numericValue : null,
        isPerfect: isPerfect || false
      });
      await checkIn.save();
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
    
    // 发送通知给伴侣
    const notifyPartner = req.app.locals.notifyPartner;
    const sendNotification = req.app.locals.sendNotification;
    if (notifyPartner && user.partnerId) {
      // 检查是否双方都完成了（双人任务）
      const partnerCheckIn = await CheckIn.findOne({ 
        habitId: req.params.id, 
        userId: user.partnerId, 
        date 
      });
      const isBothComplete = habit.participation === 'both' && partnerCheckIn;
      const pronoun = getPronoun(user.gender);
      
      const message = {
        type: isBothComplete ? 'habitBothComplete' : 'habitCheckIn',
        data: {
          habitId: habit._id,
          habitTitle: habit.title,
          userId: userId,
          userName: user.nickname || '我',
          userGender: user.gender,
          participation: habit.participation,
          date,
          isComplete: habit.participation !== 'both',
          isBothComplete
        }
      };
      notifyPartner(user.partnerId, message);
      
      // 推送通知
      if (sendNotification) {
        if (isBothComplete) {
          // 双方都完成了
          const payload = getPushPayload('habitBothComplete', {
            habitTitle: habit.title
          }, { url: '/plans' });
          sendNotification(user.partnerId, payload);
        } else {
          // 对方刚完成
          const payload = getPushPayload('habitCheckIn', {
            nickname: user.nickname,
            pronoun,
            habitTitle: habit.title
          }, { url: '/plans' });
          sendNotification(user.partnerId, payload);
        }
      }
    }
    
    res.json({ success: true, message: isUpdate ? '更新打卡成功' : '打卡成功', data: checkIn, isUpdate });
  } catch (error) {
    console.log('打卡出错：', error);
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
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = { id: u._id, nickname: u.nickname, avatar: u.avatar };
    });
    
    const result = checkIns.map(c => ({ ...c.toObject(), user: userMap[c.userId] || null }));
    res.json({ success: true, data: result });
  } catch (error) {
    console.log('获取打卡记录出错：', error);
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
    const todayStr = new Date().toISOString().split('T')[0];
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
    console.log('获取今日打卡状态出错：', error);
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
    console.log('获取统计数据出错：', error);
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
    const habit = await Habit.findOne({ _id: req.params.id, coupleId });
    
    if (!habit) {
      return res.status(404).json({ success: false, message: '计划不存在' });
    }
    
    // 检查权限
    if (habit.participation === 'self' && habit.createdBy !== userId) {
      return res.status(403).json({ success: false, message: '只有创建者可以完成此计划' });
    }
    
    // 标记为已完成（归档）
    habit.status = 'completed';
    habit.completedAt = new Date();
    habit.completedBy = userId;
    await habit.save();
    
    // 通知双方计划完成
    const notifyPartner = req.app.locals.notifyPartner;
    const sendNotification = req.app.locals.sendNotification;
    if (notifyPartner && user.partnerId) {
      const pronoun = getPronoun(user.gender);
      
      notifyPartner(user.partnerId, {
        type: 'habitCompleted',
        data: {
          habitId: habit._id,
          habitTitle: habit.title,
          userName: user.nickname || '我',
          userGender: user.gender,
          participation: habit.participation
        }
      });
      
      if (sendNotification) {
        const payload = getPushPayload('habitCompleted', {
          nickname: user.nickname,
          pronoun,
          habitTitle: habit.title,
          participation: habit.participation
        }, { url: '/plans' });
        sendNotification(user.partnerId, payload);
      }
    }
    
    res.json({ success: true, message: '计划已完成', data: habit });
  } catch (error) {
    console.log('完成计划出错：', error);
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
      weekDates.push(d.toISOString().split('T')[0]);
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
    console.log('获取周报出错：', error);
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
    console.log('更新通知设置出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

module.exports = router;
