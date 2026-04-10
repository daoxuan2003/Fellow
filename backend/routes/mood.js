// ============================================
// 心情记录路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User, MoodRecord } = require('../models');
const { getPushPayload } = require('../config/notifications');
const storageService = require('../services/storage');

const router = express.Router();

/**
 * @route   POST /api/mood
 * @desc    记录心情（每天可多条）
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { mood, note, recordDate, isMakeUp = false } = req.body;
    
    if (!mood) {
      return res.status(400).json({
        success: false,
        message: '请选择心情'
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
    
    const coupleId = [userId, user.partnerId.toString()].sort().join('_');
    const date = recordDate || new Date().toISOString().split('T')[0];
    
    // 创建新记录（每天可以有多条）
    const record = new MoodRecord({
      userId,
      coupleId,
      mood,
      note: note?.trim() || '',
      recordDate: date,
      isMakeUp
    });
    
    await record.save();
    
    // 通知伴侣
    const broadcastToCouple = req.app.locals.broadcastToCouple;
    const sendNotification = req.app.locals.sendNotification;
    
    if (broadcastToCouple) {
      broadcastToCouple(coupleId, {
        type: 'moodUpdated',
        data: {
          recordId: record._id,
          userId,
          mood,
          recordDate: date
        }
      });
    }
    
    // 推送通知给伴侣
    if (sendNotification && user.partnerId) {
      const payload = getPushPayload('moodUpdated', {
        nickname: user.nickname,
        mood
      }, { url: '/mood' });
      sendNotification(user.partnerId, payload);
    }
    
    res.json({
      success: true,
      message: '记录成功',
      data: {
        id: record._id,
        mood: record.mood,
        note: record.note,
        recordDate: record.recordDate,
        isMakeUp: record.isMakeUp,
        createdAt: record.createdAt
      }
    });
  } catch (error) {
    console.error('[Mood] 记录心情出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   GET /api/mood
 * @desc    获取心情列表（支持按日期范围查询）
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { startDate, endDate, date, limit = 50 } = req.query;
    
    const user = await User.findById(userId);
    if (!user?.partnerId) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const coupleId = [userId.toString(), user.partnerId.toString()].sort().join('_');
    const query = { coupleId };
    
    if (date) {
      query.recordDate = date;
    } else if (startDate && endDate) {
      query.recordDate = { $gte: startDate, $lte: endDate };
    }
    
    const records = await MoodRecord.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    // 获取双方用户信息
    const users = await User.find({
      _id: { $in: [userId, user.partnerId] }
    });
    
    // 生成头像预签名 URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const userMap = {};
    await Promise.all(users.map(async (u) => {
      let avatarUrl = null;
      if (u.avatar) {
        avatarUrl = await storageService.getUrl(u.avatar, 86400, baseUrl);
      }
      userMap[u._id.toString()] = {
        id: u._id.toString(),
        nickname: u.nickname,
        avatar: u.avatar,
        avatarUrl,
        gender: u.gender
      };
    }));
    
    const result = records.map(r => ({
      id: r._id,
      mood: r.mood,
      note: r.note,
      recordDate: r.recordDate,
      isMakeUp: r.isMakeUp,
      user: userMap[r.userId.toString()],
      createdAt: r.createdAt
    }));
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Mood] 获取心情列表出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   GET /api/mood/daily
 * @desc    获取每日最新心情（用于趋势图，每天只取最后一条）
 * @access  Private
 */
router.get('/daily', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { startDate, endDate } = req.query;
    
    const user = await User.findById(userId);
    if (!user?.partnerId) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const coupleId = [userId.toString(), user.partnerId.toString()].sort().join('_');
    
    // 聚合查询：按用户和日期分组，取每天最后一条
    const pipeline = [
      {
        $match: {
          coupleId,
          ...(startDate && endDate ? { recordDate: { $gte: startDate, $lte: endDate } } : {})
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: { userId: '$userId', recordDate: '$recordDate' },
          mood: { $first: '$mood' },
          note: { $first: '$note' },
          recordId: { $first: '$_id' },
          createdAt: { $first: '$createdAt' }
        }
      },
      {
        $sort: { '_id.recordDate': -1, '_id.userId': 1 }
      }
    ];
    
    const dailyRecords = await MoodRecord.aggregate(pipeline);
    
    // 获取用户信息
    const users = await User.find({
      _id: { $in: [userId, user.partnerId] }
    });
    
    // 生成头像预签名 URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const userMap = {};
    await Promise.all(users.map(async (u) => {
      let avatarUrl = null;
      if (u.avatar) {
        avatarUrl = await storageService.getUrl(u.avatar, 86400, baseUrl);
      }
      userMap[u._id.toString()] = {
        id: u._id.toString(),
        nickname: u.nickname,
        avatar: u.avatar,
        avatarUrl,
        gender: u.gender
      };
    }));
    
    // 按日期分组
    const groupedByDate = {};
    dailyRecords.forEach(r => {
      const date = r._id.recordDate;
      if (!groupedByDate[date]) {
        groupedByDate[date] = {
          date,
          records: []
        };
      }
      groupedByDate[date].records.push({
        id: r.recordId,
        mood: r.mood,
        note: r.note,
        user: userMap[r._id.userId.toString()],
        createdAt: r.createdAt
      });
    });
    
    const result = Object.values(groupedByDate).sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Mood] 获取每日心情出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   GET /api/mood/stats
 * @desc    获取心情统计（按月）
 * @access  Private
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { month } = req.query;
    
    const user = await User.findById(userId);
    if (!user?.partnerId) {
      return res.json({
        success: true,
        data: null
      });
    }
    
    const coupleId = [userId.toString(), user.partnerId.toString()].sort().join('_');
    
    // 构建日期范围
    const startDate = `${month}-01`;
    const endDate = new Date(month);
    endDate.setMonth(endDate.getMonth() + 1);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // 获取该月所有记录
    const records = await MoodRecord.find({
      coupleId,
      recordDate: { $gte: startDate, $lt: endDateStr }
    }).sort({ createdAt: 1 });
    
    // 统计：每天只取最后一条用于趋势
    const dailyMoods = {};
    records.forEach(r => {
      dailyMoods[`${r.userId}_${r.recordDate}`] = r.mood;
    });
    
    // 统计心情分布
    const myStats = {};
    const partnerStats = {};
    const dailyRecords = {};
    
    Object.entries(dailyMoods).forEach(([key, mood]) => {
      const [uid, date] = key.split('_');
      
      // 心情统计
      const target = uid === userId ? myStats : partnerStats;
      target[mood] = (target[mood] || 0) + 1;
      
      // 按日分组
      if (!dailyRecords[date]) {
        dailyRecords[date] = {};
      }
      dailyRecords[date][uid] = mood;
    });
    
    res.json({
      success: true,
      data: {
        month,
        myStats,
        partnerStats,
        dailyRecords,
        totalDays: Object.keys(dailyRecords).length
      }
    });
  } catch (error) {
    console.error('[Mood] 获取心情统计出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   DELETE /api/mood/:id
 * @desc    删除心情记录
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const record = await MoodRecord.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }
    
    if (record.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '只能删除自己的记录'
      });
    }
    
    await MoodRecord.deleteOne({ _id: req.params.id });
    
    // 通知
    const broadcastToCouple = req.app.locals.broadcastToCouple;
    if (broadcastToCouple) {
      broadcastToCouple(record.coupleId, {
        type: 'moodDeleted',
        data: { recordId: record._id }
      });
    }
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('[Mood] 删除心情出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
