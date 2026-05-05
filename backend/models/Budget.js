// ============================================
// 情侣账本模型：资产、交易、预算设置
// ============================================

const mongoose = require('mongoose');

// 资产账户
const assetSchema = new mongoose.Schema({
  coupleId: { type: String, required: true, index: true },
  name: { type: String, required: true, maxlength: 50 },
  type: {
    type: String,
    enum: ['cash', 'wechat', 'alipay', 'bank', 'other'],
    default: 'cash'
  },
  balance: { type: Number, default: 0, min: 0 },
  creatorId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 交易记录
const transactionSchema = new mongoose.Schema({
  coupleId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['expense', 'income'],
    required: true
  },
  amount: { type: Number, required: true, min: 0 },
  category: {
    type: String,
    enum: ['dining', 'transport', 'shopping', 'entertainment', 'study', 'living', 'medical', 'gift', 'travel', 'other'],
    required: true
  },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', default: null },
  date: { type: Date, required: true, index: true },
  note: { type: String, default: '', maxlength: 200 },
  creatorId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

transactionSchema.index({ coupleId: 1, date: -1 });
transactionSchema.index({ coupleId: 1, category: 1, date: -1 });

// 预算设置
const budgetSettingsSchema = new mongoose.Schema({
  coupleId: { type: String, required: true, unique: true },
  monthlyBudget: { type: Number, default: 3000, min: 0 },
  categoryBudgets: {
    type: Map,
    of: Number,
    default: {
      dining: 800,
      transport: 400,
      shopping: 600,
      entertainment: 400,
      study: 300,
      living: 300,
      medical: 200,
      gift: 200,
      travel: 500,
      other: 200
    }
  },
  travelQuota: {
    period: { type: String, enum: ['weekly', 'monthly'], default: 'monthly' },
    limit: { type: Number, default: 4, min: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = {
  Asset: mongoose.model('Asset', assetSchema),
  Transaction: mongoose.model('Transaction', transactionSchema),
  BudgetSettings: mongoose.model('BudgetSettings', budgetSettingsSchema)
};
