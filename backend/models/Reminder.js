// ============================================
// 提醒事项模型
// ============================================

const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  // 关联信息
  creatorId: {
    type: String,
    required: true
  },
  coupleId: {
    type: String,
    required: true
  },
  
  // 提醒内容
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  
  // 提醒时间
  remindAt: {
    type: Date,
    required: true
  },
  
  // 循环类型：once(一次性) / daily(每天) / weekly(每周) / monthly(每月)
  repeatType: {
    type: String,
    enum: ['once', 'daily', 'weekly', 'monthly'],
    default: 'once'
  },
  repeatData: {
    // weekly: [1,3,5] 表示周一三五
    // monthly: [1, 15] 表示每月1号和15号
    type: [Number],
    default: []
  },
  
  // 优先级：low / normal / high
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  
  // 状态
  status: {
    type: String,
    enum: ['pending', 'completed', 'archived'],
    default: 'pending'
  },
  completedAt: {
    type: Date,
    default: null
  },
  completedBy: {
    type: String,
    default: null
  },
  
  // 下次提醒时间（用于循环提醒计算）
  nextRemindAt: {
    type: Date,
    default: null
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

reminderSchema.index({ coupleId: 1, status: 1, remindAt: 1 });
reminderSchema.index({ nextRemindAt: 1, status: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
