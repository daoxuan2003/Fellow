const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
  sequence: { type: Number, required: true, min: 1 },
  dueDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  plannedAmount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
  paidAt: { type: Date, default: null },
  paidBy: { type: String, default: null },
  paymentReference: { type: String, default: null }
}, { _id: true });

const debtPlanSchema = new mongoose.Schema({
  coupleId: { type: String, required: true, index: true },
  ownerId: { type: String, required: true, index: true },
  liabilityAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  name: { type: String, required: true, trim: true, maxlength: 40 },
  provider: {
    type: String,
    enum: ['huabei', 'baitiao', 'credit_card', 'loan', 'other'],
    default: 'other'
  },
  originalAmount: { type: Number, required: true, min: 0 },
  feeAmount: { type: Number, default: 0, min: 0 },
  outstandingAmount: { type: Number, required: true, min: 0 },
  firstDueDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  installmentCount: { type: Number, required: true, min: 1, max: 120 },
  schedule: { type: [installmentSchema], default: [] },
  creationRequestId: { type: String, default: undefined, maxlength: 80, select: false },
  setupStatus: { type: String, enum: ['pending', 'ready'], default: 'ready' },
  setupCreatedAccount: { type: Boolean, default: false },
  setupPreviousAccountBalance: { type: Number, default: undefined },
  setupPreviousAccountUpdatedAt: { type: Date, default: undefined },
  paymentMutationRequestId: { type: String, default: undefined, maxlength: 80, select: false },
  status: { type: String, enum: ['active', 'paid', 'archived'], default: 'active' }
}, { timestamps: true });

debtPlanSchema.index({ coupleId: 1, ownerId: 1, status: 1 });
debtPlanSchema.index({ coupleId: 1, 'schedule.dueDate': 1 });
debtPlanSchema.index(
  { coupleId: 1, creationRequestId: 1 },
  { unique: true, partialFilterExpression: { creationRequestId: { $type: 'string' } } }
);

const pocketSchema = new mongoose.Schema({
  key: {
    type: String,
    enum: ['debt', 'living', 'travel', 'couple', 'flexible'],
    required: true
  },
  amount: { type: Number, default: 0, min: 0 }
}, { _id: false });

const monthlyWalletPlanSchema = new mongoose.Schema({
  coupleId: { type: String, required: true, index: true },
  ownerId: { type: String, required: true, index: true },
  month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
  expectedIncome: {
    title: { type: String, default: '预计收入', maxlength: 30 },
    amount: { type: Number, default: 0, min: 0 },
    date: { type: String, default: '', match: /^$|^\d{4}-\d{2}-\d{2}$/ }
  },
  pockets: { type: [pocketSchema], default: [] }
}, { timestamps: true });

monthlyWalletPlanSchema.index({ coupleId: 1, ownerId: 1, month: 1 }, { unique: true });

const debtPaymentSchema = new mongoose.Schema({
  coupleId: { type: String, required: true, index: true },
  debtPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'DebtPlan', required: true },
  payerId: { type: String, required: true, index: true },
  debtOwnerId: { type: String, required: true, index: true },
  assetAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  liabilityAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  amount: { type: Number, required: true, min: 0.01 },
  requestId: { type: String, required: true, maxlength: 80 },
  requestHash: { type: String, default: undefined, maxlength: 64, select: false },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
  mutationStatus: {
    type: String,
    enum: ['pending', 'compensating', 'ready'],
    default: 'ready'
  },
  mutationPaidAt: { type: Date, default: undefined, select: false },
  mutationNote: { type: String, default: undefined, maxlength: 200, select: false },
  mutationPreviousOutstandingAmount: { type: Number, default: undefined, select: false },
  mutationPreviousDebtStatus: { type: String, default: undefined, select: false },
  mutationPreviousSchedule: { type: mongoose.Schema.Types.Mixed, default: undefined, select: false },
  mutationNextOutstandingAmount: { type: Number, default: undefined, select: false },
  mutationNextDebtStatus: { type: String, default: undefined, select: false },
  mutationNextSchedule: { type: mongoose.Schema.Types.Mixed, default: undefined, select: false },
  allocations: [{
    installmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true, min: 0.01 }
  }]
}, { timestamps: true });

debtPaymentSchema.index({ coupleId: 1, requestId: 1 }, { unique: true });
debtPaymentSchema.index({ coupleId: 1, debtPlanId: 1, createdAt: -1 });

module.exports = {
  DebtPlan: mongoose.model('DebtPlan', debtPlanSchema),
  MonthlyWalletPlan: mongoose.model('MonthlyWalletPlan', monthlyWalletPlanSchema),
  DebtPayment: mongoose.model('DebtPayment', debtPaymentSchema)
};
