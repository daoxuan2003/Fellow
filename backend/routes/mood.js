// ============================================
// 心情记录路由
// ============================================

const express = require('express');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware');
const { User, MoodRecord } = require('../models');
const { getPushPayload } = require('../config/notifications');
const storageService = require('../services/storage');
const { DEFAULT_TIME_ZONE, formatDate, getTodayString } = require('../utils/helpers');
const { logError } = require('../utils/safeLogger');

const router = express.Router();
const VALID_MOODS = new Set([
  'happy', 'calm', 'missing', 'expectant', 'shy', 'bored',
  'tired', 'wronged', 'sad', 'anxious', 'angry', 'overwhelmed',
  'excited', 'sick', 'loved'
]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const RESPONSE_KINDS = new Set(['hug', 'stay', 'listen', 'cheer']);

function emitMoodSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;
  const { action, payload, actor, requestId } = options;
  broadcastToCouple(coupleId, {
    type: 'moodSync',
    data: { action, payload, actor, requestId: requestId || null, timestamp: Date.now() }
  });
}

function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function currentShanghaiTime() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DEFAULT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}

function parseShanghaiRecordedAt(recordDate, recordTime) {
  if (!TIME_PATTERN.test(recordTime)) return null;
  // Fellow date-only values are Asia/Shanghai calendar dates. China has no daylight-saving adjustment.
  const recordedAt = new Date(`${recordDate}T${recordTime}:00+08:00`);
  if (Number.isNaN(recordedAt.getTime()) || formatDate(recordedAt, DEFAULT_TIME_ZONE) !== recordDate) return null;
  return recordedAt;
}

/**
 * @route   POST /api/mood
 * @desc    记录心情（每天可多条）
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { mood, note, recordDate, recordTime } = req.body;
    
    if (!VALID_MOODS.has(mood)) {
      return res.status(400).json({
        success: false,
        message: '请选择有效的心情'
      });
    }

    if (typeof note !== 'undefined' && (typeof note !== 'string' || note.length > 300)) {
      return res.status(400).json({ success: false, message: '心情文字不能超过 300 个字' });
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
    const date = recordDate || getTodayString();
    if (!isValidDateString(date)) {
      return res.status(400).json({ success: false, message: '记录日期不正确' });
    }
    const today = getTodayString();
    if (date > today) {
      return res.status(400).json({ success: false, message: '不能记录未来的心情' });
    }
    const effectiveTime = recordTime || currentShanghaiTime();
    const recordedAt = parseShanghaiRecordedAt(date, effectiveTime);
    if (!recordedAt || recordedAt.getTime() > Date.now() + 60 * 1000) {
      return res.status(400).json({ success: false, message: '记录时间不正确' });
    }
    
    // 创建新记录（每天可以有多条）
    const record = new MoodRecord({
      userId,
      coupleId,
      mood,
      note: note?.trim() || '',
      recordDate: date,
      isMakeUp: date < today,
      recordedAt
    });
    
    await record.save();
    
    // 通知伴侣
    const sendNotification = req.app.locals.sendNotification;
    emitMoodSync(req.app, coupleId, { action: 'create', payload: { id: record._id, userId, mood: record.mood, note: record.note, recordDate: record.recordDate, recordTime: effectiveTime, recordedAt: record.recordedAt, isMakeUp: record.isMakeUp, createdAt: record.createdAt }, actor: userId, requestId: req.body.requestId });
    
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
        recordedAt: record.recordedAt,
        isMakeUp: record.isMakeUp,
        createdAt: record.createdAt
      }
    });
  } catch (error) {
    logError('[Mood] 记录心情出错', error);
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
      .sort({ recordDate: -1, recordedAt: -1, createdAt: -1 })
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
      partnerResponse: r.partnerResponse?.kind ? {
        kind: r.partnerResponse.kind,
        message: r.partnerResponse.message || '',
        responderId: r.partnerResponse.responderId,
        respondedAt: r.partnerResponse.respondedAt
      } : null,
      comments: Array.isArray(r.comments) ? r.comments.map(comment => ({
        id: comment._id,
        commenterId: comment.commenterId,
        kind: comment.kind || null,
        message: comment.message || '',
        createdAt: comment.createdAt
      })) : [],
      recordDate: r.recordDate,
      recordedAt: r.recordedAt || r.createdAt,
      isMakeUp: r.isMakeUp,
      user: userMap[r.userId.toString()],
      createdAt: r.createdAt
    }));
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logError('[Mood] 获取心情列表出错', error);
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
        $addFields: { effectiveRecordedAt: { $ifNull: ['$recordedAt', '$createdAt'] } }
      },
      {
        $sort: { effectiveRecordedAt: -1, createdAt: -1 }
      },
      {
        $group: {
          _id: { userId: '$userId', recordDate: '$recordDate' },
          mood: { $first: '$mood' },
          note: { $first: '$note' },
          recordId: { $first: '$_id' },
          recordedAt: { $first: '$effectiveRecordedAt' },
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
        recordedAt: r.recordedAt || r.createdAt,
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
    logError('[Mood] 获取每日心情出错', error);
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
    const endDateStr = formatDate(endDate);
    
    // 获取该月所有记录
    const records = await MoodRecord.find({
      coupleId,
      recordDate: { $gte: startDate, $lt: endDateStr }
    });
    records.sort((a, b) => new Date(a.recordedAt || a.createdAt) - new Date(b.recordedAt || b.createdAt));
    
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
    logError('[Mood] 获取心情统计出错', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/mood/:id/response
 * @desc    伴侣回应一条心情
 * @access  Private
 */
router.put('/:id/response', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { kind, message = '' } = req.body;
    if (!RESPONSE_KINDS.has(kind)) {
      return res.status(400).json({ success: false, message: '请选择有效的回应' });
    }
    if (typeof message !== 'string' || message.trim().length > 60) {
      return res.status(400).json({ success: false, message: '短留言不能超过 60 个字' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const user = await User.findById(userId);
    if (!user?.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣才能使用此功能' });
    }
    const coupleId = [userId, user.partnerId.toString()].sort().join('_');
    const existing = await MoodRecord.findOne({ _id: req.params.id, coupleId });
    if (!existing) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    if (String(existing.userId) === String(userId)) {
      return res.status(403).json({ success: false, message: '只能回应伴侣的心情' });
    }

    const respondedAt = new Date();
    const partnerResponse = {
      kind,
      message: message.trim(),
      responderId: userId,
      respondedAt
    };
    const record = await MoodRecord.findOneAndUpdate(
      { _id: req.params.id, coupleId, userId: { $ne: userId } },
      { $set: { partnerResponse, updatedAt: respondedAt } },
      { new: true }
    );
    if (!record) {
      return res.status(409).json({ success: false, message: '心情已变化，请刷新后重试' });
    }

    emitMoodSync(req.app, coupleId, {
      action: 'response',
      payload: { id: record._id, partnerResponse },
      actor: userId,
      requestId: req.body.requestId
    });

    res.json({ success: true, message: '回应已送达', data: partnerResponse });
  } catch (error) {
    logError('[Mood] 回应心情出错', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   POST /api/mood/:id/comments
 * @desc    在当前情侣关系的一条心情下追加评论
 * @access  Private
 */
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const input = req.body && typeof req.body === 'object' ? req.body : {};
    const rawKind = input.kind;
    const kind = rawKind === '' || rawKind === null || typeof rawKind === 'undefined' ? null : rawKind;
    const message = typeof input.message === 'string' ? input.message.trim() : '';

    if (kind !== null && !RESPONSE_KINDS.has(kind)) {
      return res.status(400).json({ success: false, message: '请选择有效的回应' });
    }
    if (typeof input.message !== 'undefined' && typeof input.message !== 'string') {
      return res.status(400).json({ success: false, message: '评论格式不正确' });
    }
    if (message.length > 120) {
      return res.status(400).json({ success: false, message: '短留言不能超过 120 个字' });
    }
    if (!kind && !message) {
      return res.status(400).json({ success: false, message: '选一个回应，或者留一句话吧' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const user = await User.findById(userId);
    if (!user?.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣才能使用此功能' });
    }

    const coupleId = [userId.toString(), user.partnerId.toString()].sort().join('_');
    const createdAt = new Date();
    const comment = {
      _id: new mongoose.Types.ObjectId(),
      commenterId: userId,
      kind,
      message,
      createdAt
    };
    const record = await MoodRecord.findOneAndUpdate(
      { _id: req.params.id, coupleId },
      { $push: { comments: comment }, $set: { updatedAt: createdAt } },
      { new: true }
    );
    if (!record) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const responseComment = {
      id: comment._id,
      commenterId: comment.commenterId,
      kind: comment.kind,
      message: comment.message,
      createdAt: comment.createdAt
    };
    emitMoodSync(req.app, coupleId, {
      action: 'comment',
      payload: { id: record._id, comment: responseComment },
      actor: userId,
      requestId: input.requestId
    });

    res.json({ success: true, message: '评论已送达', data: responseComment });
  } catch (error) {
    logError('[Mood] 评论心情出错', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
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
    const user = await User.findById(userId);
    if (!user?.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣才能使用此功能'
      });
    }

    const coupleId = [userId, user.partnerId.toString()].sort().join('_');
    const record = await MoodRecord.findOne({ _id: req.params.id, userId, coupleId });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    const deleteResult = await MoodRecord.deleteOne({ _id: req.params.id, userId, coupleId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    emitMoodSync(req.app, coupleId, { action: 'delete', payload: { id: record._id, userId: record.userId }, actor: userId, requestId: req.body.requestId });
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    logError('[Mood] 删除心情出错', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
