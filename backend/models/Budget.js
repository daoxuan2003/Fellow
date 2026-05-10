// ============================================
// 情侣账本模型 v2：自定义分类 + 净资产快照 + 通用额度
// ============================================

const mongoose = require('mongoose');

// 自定义分类（完全由用户创建，无预设）
const categorySchema = new mongoose.Schema({
  coupleId: { type: String, required: true, index: true },
  name: { type: String, required: true, maxlength: 20 },
  emoji: { type: String, default: '📦', maxlength: 10 },
  budget: { type: Number, default: 0, min: 0 },        // 月度预算，0 表示不限
  quota: { type: Number, default: 0, min: 0 },         // 次数/数量限制，0 表示不限
  quotaType: { type: String, enum: ['count', 'amount'], default: 'count' }, // 限制类型：次数 or 金额
  period: { type: String, enum: ['weekly', 'monthly', 'yearly'], default: 'monthly' },
  creatorId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

categorySchema.index({ coupleId: 1, name: 1 });

// 交易记录（关联资产账户）
const transactionSchema = new mongoose.Schema({
  coupleId: { type: String, required: true, index: true },
  type: { type: String, enum: ['expense', 'income', 'transfer'], required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'CNY', maxlength: 10 },
  category: { type: String, default: '' },          // 自定义分类名称
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null }, // 关联账户（转出/支出/收入账户）
  toAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null }, // 转入账户（转账专用）
  date: { type: Date, required: true, index: true },
  note: { type: String, default: '', maxlength: 200 },
  creatorId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

transactionSchema.index({ coupleId: 1, date: -1 });
transactionSchema.index({ coupleId: 1, category: 1, date: -1 });

// 净资产快照（记录每个人在某个时间点的资产）
const netWorthSchema = new mongoose.Schema({
  coupleId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  note: { type: String, default: '', maxlength: 100 },
  createdAt: { type: Date, default: Date.now }
});

netWorthSchema.index({ coupleId: 1, date: -1 });

// 预算设置（仅存总预算，分类预算存到 Category）
const budgetSettingsSchema = new mongoose.Schema({
  coupleId: { type: String, required: true, unique: true },
  monthlyBudget: { type: Number, default: 0, min: 0 },  // 0 表示不设置总预算
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = {
  Category: mongoose.model('Category', categorySchema),
  Transaction: mongoose.model('Transaction', transactionSchema),
  NetWorth: mongoose.model('NetWorth', netWorthSchema),
  BudgetSettings: mongoose.model('BudgetSettings', budgetSettingsSchema)
};
