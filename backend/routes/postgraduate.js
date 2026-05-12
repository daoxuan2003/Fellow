// ============================================
// 考研进度板路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User, PostgraduateProgress } = require('../models');
const { getPushPayload } = require('../config/notifications');

const router = express.Router();

// 获取今天日期字符串
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 计算连续报到天数
const calculateStreak = (checkIns) => {
  if (!checkIns || checkIns.length === 0) return 0;
  const dates = [...new Set(checkIns.map(c => c.date))].sort((a, b) => b.localeCompare(a));
  const today = getTodayStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  let streak = 0;
  let checkIndex = 0;

  // 今天报到了，从今天算起
  if (dates[0] === today) {
    streak++;
    checkIndex++;
  }
  // 今天没报到但昨天报到了，从昨天算起
  else if (dates[0] === yesterdayStr) {
    streak++;
    checkIndex++;
  }
  // 今天昨天都没报到
  else {
    return 0;
  }

  // 往前数连续天数
  while (checkIndex < dates.length) {
    const prevDate = new Date(dates[checkIndex - 1]);
    prevDate.setDate(prevDate.getDate() - 1);
    const expectedStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
    if (dates[checkIndex] === expectedStr) {
      streak++;
      checkIndex++;
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
      progress = new PostgraduateProgress({ coupleId });
      await progress.save();
    }

    const todayWeekday = new Date().getDay();
    const todaySubjects = progress.weeklySchedule.get(String(todayWeekday)) || [];

    let daysLeft = null;
    if (progress.targetDate) {
      const target = new Date(progress.targetDate);
      const now = new Date();
      daysLeft = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      daysLeft = Math.max(0, daysLeft);
    }

    const todayStr = getTodayStr();
    const todayCheckIn = progress.checkIns?.find(c => c.date === todayStr);
    const streak = calculateStreak(progress.checkIns || []);

    res.json({
      success: true,
      data: {
        ...progress.toObject(),
        todaySubjects,
        daysLeft,
        todayWeekday,
        todayCheckedIn: !!todayCheckIn,
        todayCheckIn: todayCheckIn || null,
        streak
      }
    });
  } catch (error) {
    console.log('获取考研进度出错:', error);
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
    if (subjects !== undefined) updateFields.subjects = subjects;
    if (weeklySchedule !== undefined) updateFields.weeklySchedule = weeklySchedule;
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
    console.log('更新考研进度出错:', error);
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

    const { subjects, note } = req.body;
    const coupleId = [userId, user.partnerId].sort().join('_');
    const todayStr = getTodayStr();

    // 使用原子操作更新
    const progress = await PostgraduateProgress.findOneAndUpdate(
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
            subjects: subjects || [],
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
      const subjectStr = subjects && subjects.length > 0 ? subjects.join('、') : '完成了今日学习';
      const payload = getPushPayload('postgraduateReminder', {
        nickname: user.nickname,
        title: '学习报到',
        body: `${user.nickname}今日已报到，学了：${subjectStr}${note ? '（' + note + '）' : ''}`
      }, { url: '/postgraduate' });
      payload.title = '学习报到';
      payload.body = `${user.nickname}今日已报到，学了：${subjectStr}${note ? '（' + note + '）' : ''}`;
      await sendNotification(user.partnerId, payload);
    }

    res.json({
      success: true,
      message: '报到成功',
      data: { todayCheckIn, streak, todayCheckedIn: true }
    });
  } catch (error) {
    console.log('学习报到出错:', error);
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
    console.log('取消报到出错:', error);
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
    console.log('发送考研通知出错:', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

module.exports = router;
