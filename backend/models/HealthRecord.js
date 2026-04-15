// ============================================
// 健康档案记录模型
// ============================================

const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  coupleId: {
    type: String,
    required: true
  },
  // 基础信息
  height: {
    type: Number,
    default: null
  },
  weight: {
    type: Number,
    default: null
  },
  bodyFat: {
    type: Number,
    default: null
  },
  // 围度（cm）
  measurements: {
    chest: { type: Number, default: null },      // 胸围（男性）
    chestUpper: { type: Number, default: null }, // 上胸围（女性）
    chestLower: { type: Number, default: null }, // 下胸围（女性）
    waist: { type: Number, default: null },      // 腰围
    hip: { type: Number, default: null },        // 臀围
    arm: { type: Number, default: null },        // 臂围
    thigh: { type: Number, default: null },      // 大腿围
    calf: { type: Number, default: null },       // 小腿围
    shoulder: { type: Number, default: null }    // 肩宽
  },
  // 月经周期
  menstrual: {
    cycleStart: { type: Date, default: null },
    cycleEnd: { type: Date, default: null },
    flowLevel: { type: Number, min: 1, max: 5, default: null },
    note: { type: String, default: '' }
  },
  note: {
    type: String,
    default: ''
  },
  // 记录日期（用户可选，默认当天）
  recordedAt: {
    type: Date,
    default: Date.now
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

// 索引
healthRecordSchema.index({ userId: 1, recordedAt: -1 });
healthRecordSchema.index({ coupleId: 1, recordedAt: -1 });

// 更新前自动更新 updatedAt
healthRecordSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('HealthRecord', healthRecordSchema);
