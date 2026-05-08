// ============================================
// 资产账户模型：支持多币种、资产/负债分类
// ============================================

const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  coupleId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true, maxlength: 30 },
  type: { type: String, enum: ['asset', 'liability'], required: true },
  subType: { 
    type: String, 
    enum: ['wechat', 'alipay', 'bank', 'cash', 'investment', 'other_asset', 'huabei', 'baitiao', 'credit_card', 'loan', 'other_liability'],
    default: 'other_asset'
  },
  currency: { type: String, required: true, default: 'CNY', maxlength: 10 },
  balance: { type: Number, default: 0 },
  icon: { type: String, default: '💰', maxlength: 10 },
  color: { type: String, default: '#6366f1', maxlength: 20 },
  isArchived: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

accountSchema.index({ coupleId: 1, type: 1, sortOrder: 1 });
accountSchema.index({ coupleId: 1, userId: 1 });

module.exports = mongoose.model('Account', accountSchema);
