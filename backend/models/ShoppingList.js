// ============================================
// 购物清单模型（独立的清单实体）
// ============================================

const mongoose = require('mongoose');

const shoppingListSchema = new mongoose.Schema({
  // 关联信息
  createdBy: {
    type: String,
    required: true
  },
  coupleId: {
    type: String,
    required: true
  },
  
  // 清单名称
  name: {
    type: String,
    required: true
  },
  
  // 清单归属：self(我的清单) / partner(对方的清单) / both(共同清单)
  ownership: {
    type: String,
    enum: ['self', 'partner', 'both'],
    default: 'self'
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 复合唯一索引：同一对情侣下，同一归属的清单名不能重复
shoppingListSchema.index({ coupleId: 1, name: 1, ownership: 1 }, { unique: true });

module.exports = mongoose.model('ShoppingList', shoppingListSchema);
