// ============================================
// 购物清单模型
// ============================================

const mongoose = require('mongoose');

const shoppingItemSchema = new mongoose.Schema({
  // 关联信息
  createdBy: {
    type: String,
    required: true
  },
  coupleId: {
    type: String,
    required: true
  },
  
  // 购物项信息
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: String,
    default: '1'
  },
  note: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: null
  },
  
  // 清单名称
  listName: {
    type: String,
    default: ''
  },
  
  // 清单归属：self(我的清单) / partner(对方的清单) / both(共同清单)
  listOwnership: {
    type: String,
    enum: ['self', 'partner', 'both'],
    default: 'self'
  },
  
  // 物品归属：self(我) / partner(对方) / both(共同)
  ownership: {
    type: String,
    enum: ['self', 'partner', 'both'],
    default: 'both'
  },
  
  // 状态：pending(待购) / completed(已购)
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  completedBy: {
    type: String,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ShoppingItem', shoppingItemSchema);
