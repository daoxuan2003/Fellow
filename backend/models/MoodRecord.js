// ============================================
// 心情记录模型
// 支持每天多条记录，趋势图按天聚合取最后一条
// ============================================

const mongoose = require('mongoose');

const moodRecordSchema = new mongoose.Schema({
  // 关联信息
  userId: {
    type: String,
    required: true
  },
  coupleId: {
    type: String,
    required: true
  },
  
  // 心情信息
  mood: {
    type: String,
    enum: ['happy', 'excited', 'calm', 'tired', 'sad', 'angry', 'sick', 'loved'],
    required: true
  },
  note: {
    type: String,
    default: '',
    maxlength: 500
  },
  
  // 记录日期 (YYYY-MM-DD)，用于按天分组
  recordDate: {
    type: String,
    required: true
  },
  
  // 是否是补录
  isMakeUp: {
    type: Boolean,
    default: false
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

// 索引：按 coupleId 和日期查询，支持按天聚合时取最后一条
moodRecordSchema.index({ coupleId: 1, recordDate: -1, createdAt: -1 });
moodRecordSchema.index({ userId: 1, recordDate: -1 });

module.exports = mongoose.model('MoodRecord', moodRecordSchema);
