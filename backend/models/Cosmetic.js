// ============================================
// 化妆品保质期记录模型（简化版）
// ============================================

const mongoose = require('mongoose');

const cosmeticSchema = new mongoose.Schema({
  // 关联信息
  ownerId: {
    type: String,
    required: true
  },
  coupleId: {
    type: String,
    required: true
  },
  
  // 基本信息（简化，去掉复杂分类）
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  
  // 照片
  photoUrl: {
    type: String,
    required: true
  },
  aspectRatio: {
    type: Number,
    default: 1
  },
  
  // 日期信息
  openDate: {
    type: String,  // YYYY-MM-DD
    required: true
  },
  // 保质期月数（支持小数，如 0.5 表示半个月）
  shelfLifeMonths: {
    type: Number,
    required: true,
    min: 0.1,
    max: 120
  },
  // 计算出的过期日期
  expireDate: {
    type: String,  // YYYY-MM-DD
    required: true
  },
  
  // 提醒设置
  remindDaysBefore: {
    type: Number,
    default: 30
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  
  // 状态：active(使用中) / expired(已过期) / empty(已用完)
  status: {
    type: String,
    enum: ['active', 'expired', 'empty'],
    default: 'active'
  },
  emptiedAt: {
    type: Date,
    default: null
  },
  
  // 备注（可选）
  note: {
    type: String,
    default: '',
    maxlength: 200
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

cosmeticSchema.index({ coupleId: 1, status: 1 });
cosmeticSchema.index({ expireDate: 1, reminderSent: 1 });

module.exports = mongoose.model('Cosmetic', cosmeticSchema);
