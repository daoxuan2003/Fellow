// ============================================
// 代取快递模型
// ============================================

const mongoose = require('mongoose');

const expressDeliverySchema = new mongoose.Schema({
  // 关联信息
  requesterId: {
    type: String,
    required: true
  },
  pickerId: {
    type: String,
    default: null
  },
  coupleId: {
    type: String,
    required: true
  },
  
  // 快递信息
  trackingNo: {
    type: String,
    required: true
  },
  pickupLocation: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  
  // 优先级：normal(普通) / urgent(紧急)
  priority: {
    type: String,
    enum: ['normal', 'urgent'],
    default: 'normal'
  },
  
  // 状态：pending(待取) / picked(已取)
  status: {
    type: String,
    enum: ['pending', 'picked'],
    default: 'pending'
  },
  pickedAt: {
    type: Date,
    default: null
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ExpressDelivery', expressDeliverySchema);
