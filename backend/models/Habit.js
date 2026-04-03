// ============================================
// 坚持计划模型 - Habit
// ============================================

const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  coupleId: { 
    type: String, 
    required: true 
  },
  createdBy: { 
    type: String, 
    required: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    default: '' 
  },
  icon: { 
    type: String, 
    default: '☀️' 
  },
  color: { 
    type: String, 
    default: '#EC4899' 
  },
  type: { 
    type: String, 
    enum: ['simple', 'subtasks', 'numeric'], 
    default: 'simple' 
  },
  participation: { 
    type: String, 
    enum: ['both', 'self', 'partner'], 
    default: 'both' 
  },
  targetDays: { 
    type: Number, 
    default: 30 
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly'],
    default: 'daily'
  },
  weekdays: [{
    type: Number,
    min: 0,
    max: 6
  }],
  subTasks: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    weekday: { type: Number, min: 0, max: 6 }
  }],
  numericConfig: {
    unit: { type: String, default: '' },
    targetValue: { type: Number, default: 0 },
    lowerIsBetter: { type: Boolean, default: false }
  },
  numericRecords: [{
    date: { type: String, required: true },
    value: { type: Number, required: true },
    userId: { type: String, required: true },
    note: { type: String, default: '' }
  }],
  status: { 
    type: String, 
    enum: ['active', 'paused', 'completed'], 
    default: 'active' 
  },
  completedAt: { 
    type: Date, 
    default: null 
  },
  completedBy: { 
    type: String, 
    default: null 
  },
  startDate: {
    type: String,
    default: function() {
      return new Date().toISOString().split('T')[0]
    }
  },
  leaves: [{
    id: { type: String },
    userId: { type: String },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    reason: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

habitSchema.index({ coupleId: 1, createdBy: 1 });

module.exports = mongoose.model('Habit', habitSchema);
