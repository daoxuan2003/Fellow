// ============================================
// 考研进度数据模型
// 支持每科目多轮复习，每轮进度独立
// ============================================

const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema({
  roundName: { type: String, default: '一轮' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  currentUnit: { type: String, default: '' },
  totalUnit: { type: String, default: '' }
});

const taskSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  unit: { type: String, default: '' },
  targetAmount: { type: Number, default: 1, min: 0 },
  cadenceDays: { type: Number, default: 1, min: 1, max: 14 },
  startDate: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { _id: false });

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  currentRound: { type: Number, default: 0 },
  rounds: { type: [roundSchema], default: [{ roundName: '一轮', progress: 0, currentUnit: '', totalUnit: '' }] },
  tasks: { type: [taskSchema], default: [] },
  color: { type: String, default: '#8b5cf6' },
  icon: { type: String, default: '' }
});

const checkInTaskSchema = new mongoose.Schema({
  subjectName: { type: String, required: true },
  taskKey: { type: String, required: true },
  label: { type: String, default: '' },
  unit: { type: String, default: '' },
  targetAmount: { type: Number, default: 0, min: 0 },
  completedAmount: { type: Number, default: 0, min: 0 },
  cadenceDays: { type: Number, default: 1, min: 1 },
  status: {
    type: String,
    enum: ['done', 'partial', 'missed'],
    default: 'missed'
  }
}, { _id: false });

const checkInSchema = new mongoose.Schema({
  date: { type: String, required: true },
  subjects: { type: [String], default: [] },
  taskRecords: { type: [checkInTaskSchema], default: [] },
  completionRate: { type: Number, default: 0, min: 0, max: 100 },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const archiveEntrySchema = new mongoose.Schema({
  archivedAt: { type: Date, default: Date.now },
  repositoryName: { type: String, default: '考研全过程档案' },
  targetDate: { type: String, default: '' },
  summary: { type: mongoose.Schema.Types.Mixed, default: {} },
  snapshot: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: true });

const postgraduateProgressSchema = new mongoose.Schema({
  coupleId: { type: String, required: true, unique: true, index: true },
  subjects: { type: [subjectSchema], default: [] },
  weeklySchedule: {
    type: Map,
    of: [String],
    default: {}
  },
  checkIns: { type: [checkInSchema], default: [] },
  targetDate: { type: String, default: '' },
  notes: { type: String, default: '' },
  archiveRepository: {
    name: { type: String, default: '考研全过程档案' },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    createdAt: { type: Date, default: Date.now },
    lastArchivedAt: { type: Date, default: null },
    entries: { type: [archiveEntrySchema], default: [] }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 更新时自动更新时间
postgraduateProgressSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

postgraduateProgressSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('PostgraduateProgress', postgraduateProgressSchema);
