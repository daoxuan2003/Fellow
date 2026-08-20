// ============================================
// 考研每日协作任务模型
// ============================================

const mongoose = require('mongoose');

const postgraduateDailyTaskSchema = new mongoose.Schema({
  coupleId: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  creatorId: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80
  },
  batchId: {
    type: String,
    required: true,
    maxlength: 64
  },
  position: {
    type: Number,
    required: true,
    min: 0,
    max: 11
  },
  completedBy: {
    type: String,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

postgraduateDailyTaskSchema.index(
  { coupleId: 1, date: 1, createdAt: 1, position: 1, _id: 1 },
  { name: 'postgraduate_daily_tasks_by_day' }
);

postgraduateDailyTaskSchema.index(
  { coupleId: 1, date: 1, creatorId: 1, batchId: 1, position: 1 },
  { unique: true, name: 'postgraduate_daily_task_idempotency' }
);

module.exports = mongoose.model('PostgraduateDailyTask', postgraduateDailyTaskSchema);
