// ============================================
// 心愿墙模型
// ============================================

const mongoose = require('mongoose');

const wishSchema = new mongoose.Schema({
  // 关联信息
  coupleId: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  
  // 心愿内容
  title: {
    type: String,
    required: true,
    maxlength: 50
  },
  description: {
    type: String,
    default: '',
    maxlength: 100
  },
  
  // 类型：want(想要), travel(旅行), experience(体验)
  type: {
    type: String,
    enum: ['want', 'travel', 'experience'],
    default: 'want'
  },
  
  // 优先级：low(低), normal(中), high(高)
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  
  // 目标日期
  targetDate: {
    type: Date,
    default: null
  },
  
  // 状态：pending(进行中), completed(已完成)
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  
  // 完成信息
  completedAt: {
    type: Date,
    default: null
  },
  completedBy: {
    type: String,
    default: null
  },
  completionNote: {
    type: String,
    default: '',
    maxlength: 200
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 索引：按 coupleId 和 status 查询
wishSchema.index({ coupleId: 1, status: 1 });
wishSchema.index({ coupleId: 1, createdAt: -1 });

module.exports = mongoose.model('Wish', wishSchema);
