// ============================================
// 打卡记录模型 - CheckIn
// ============================================

const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  habitId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Habit', 
    required: true 
  },
  userId: { 
    type: String, 
    required: true 
  },
  coupleId: { 
    type: String, 
    required: true 
  },
  date: { 
    type: String, 
    required: true 
  },
  mood: { 
    type: String, 
    enum: ['happy', 'love', 'excited', 'peaceful', 'tired'], 
    default: 'happy' 
  },
  note: { 
    type: String, 
    default: '' 
  },
  completedSubTasks: [{ 
    type: String 
  }],
  completionSummary: {
    totalSubTasks: { type: Number, default: 0, min: 0 },
    completedSubTasks: { type: Number, default: 0, min: 0 },
    completionRate: { type: Number, default: 0, min: 0, max: 100 },
    totalGroups: { type: Number, default: 0, min: 0 },
    completedGroups: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['none', 'started', 'solid', 'perfect'],
      default: 'none'
    }
  },
  isPerfect: { 
    type: Boolean, 
    default: false 
  },
  numericValue: { 
    type: Number, 
    default: null 
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

checkInSchema.index({ habitId: 1, date: -1 });
checkInSchema.index({ coupleId: 1, userId: 1, date: -1 });
checkInSchema.index({ habitId: 1, userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('CheckIn', checkInSchema);
