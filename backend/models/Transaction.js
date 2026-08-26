const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  coupleId: { type: String, required: true, index: true },
  type: { type: String, enum: ['expense', 'income', 'transfer'], required: true },
  kind: {
    type: String,
    enum: ['income', 'expense', 'debt_purchase', 'asset_transfer', 'debt_payment'],
    default: null
  },
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, default: 'CNY', maxlength: 10 },
  category: { type: String, default: '', maxlength: 20 },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  toAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  debtPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'DebtPlan', default: null },
  installmentId: { type: mongoose.Schema.Types.ObjectId, default: null },
  requestId: { type: String, default: undefined, maxlength: 80 },
  mutationStatus: {
    type: String,
    enum: ['pending', 'ready'],
    default: 'ready'
  },
  walletPocketKey: { type: String, default: null, maxlength: 20 },
  date: { type: Date, required: true, index: true },
  note: { type: String, default: '', maxlength: 200 },
  creatorId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'transactions' });

transactionSchema.index({ coupleId: 1, date: -1 });
transactionSchema.index({ coupleId: 1, category: 1, date: -1 });
transactionSchema.index(
  { coupleId: 1, requestId: 1 },
  { unique: true, partialFilterExpression: { requestId: { $type: 'string' } } }
);

module.exports = mongoose.model('Transaction', transactionSchema);
