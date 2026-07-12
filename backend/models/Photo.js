// ============================================
// 相册照片模型
// ============================================

const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  // 关联信息
  coupleId: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String,
    required: true
  },
  
  // 照片信息
  url: {
    type: String,
    required: true
  },
  storagePath: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now
  },
  caption: {
    type: String,
    default: ''
  },
  tags: [{
    type: String
  }],
  
  // 宽高比，用于瀑布流计算（width/height）
  aspectRatio: {
    type: Number,
    default: 1
  },
  
  // 照片类型：normal(普通) / travel(旅行) / food(美食)
  type: {
    type: String,
    enum: ['normal', 'travel', 'food'],
    default: 'normal'
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 索引：按 coupleId 和 date 查询
photoSchema.index({ coupleId: 1, date: -1 });

module.exports = mongoose.model('Photo', photoSchema);
