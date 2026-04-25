// ============================================
// 月经周期记录模型
// 独立的月经追踪，支持周期管理 + 每日流量打卡
// ============================================

const mongoose = require('mongoose');

const menstrualRecordSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  coupleId: {
    type: String,
    required: true
  },
  // 周期开始日期
  cycleStart: {
    type: Date,
    required: true
  },
  // 周期结束日期（进行中为 null）
  cycleEnd: {
    type: Date,
    default: null
  },
  // 每日流量记录
  flowRecords: [{
    date: { type: String, required: true },      // YYYY-MM-DD
    flowLevel: { type: Number, min: 1, max: 5 },
    note: { type: String, default: '' }
  }],
  // 周期状态
  status: {
    type: String,
    enum: ['ongoing', 'completed'],
    default: 'ongoing'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 索引：快速查找用户最新的进行中的周期
menstrualRecordSchema.index({ userId: 1, status: 1, createdAt: -1 });
menstrualRecordSchema.index({ coupleId: 1, createdAt: -1 });

// 更新前自动更新 updatedAt
menstrualRecordSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MenstrualRecord', menstrualRecordSchema);
