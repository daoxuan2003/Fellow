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

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  currentRound: { type: Number, default: 0 },
  rounds: { type: [roundSchema], default: [{ roundName: '一轮', progress: 0, currentUnit: '', totalUnit: '' }] },
  color: { type: String, default: '#8b5cf6' },
  icon: { type: String, default: '' }
});

const checkInSchema = new mongoose.Schema({
  date: { type: String, required: true },
  subjects: { type: [String], default: [] },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

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
