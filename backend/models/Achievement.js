// ============================================
// 成就系统模型 - Achievement
// ============================================

const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  coupleId: {
    type: String,
    required: true
  },
  achievementId: {
    type: String,
    required: true
  },
  unlockedAt: {
    type: Date,
    default: null
  },
  progress: {
    type: Number,
    default: 0
  },
  notified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

achievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });
achievementSchema.index({ coupleId: 1, userId: 1 });

module.exports = mongoose.model('Achievement', achievementSchema);
