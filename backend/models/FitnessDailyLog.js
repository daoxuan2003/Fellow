const mongoose = require('mongoose');

const exerciseLogSchema = new mongoose.Schema({
  completed: { type: Boolean, default: false },
  actualReps: [{ type: Number, min: 0, max: 200 }],
  actualSeconds: [{ type: Number, min: 0, max: 3600 }],
  durationMinutes: { type: Number, min: 0, max: 240, default: null },
  weightKg: { type: Number, min: 0, max: 500, default: null },
  completedAt: { type: Date, default: null }
}, { _id: false });

const mealLogSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['on_plan', 'flexible', 'missed'],
    required: true
  },
  note: { type: String, trim: true, maxlength: 120, default: '' },
  recordedAt: { type: Date, required: true }
}, { _id: false });

const fitnessDailyLogSchema = new mongoose.Schema({
  coupleId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  date: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  planVersion: { type: String, required: true },
  workoutKey: { type: String, required: true, maxlength: 40 },
  exerciseLogs: {
    type: Map,
    of: exerciseLogSchema,
    default: () => new Map()
  },
  mealLogs: {
    type: Map,
    of: mealLogSchema,
    default: () => new Map()
  },
  workoutCompletedAt: { type: Date, default: null }
}, {
  timestamps: true
});

fitnessDailyLogSchema.index({ coupleId: 1, userId: 1, date: 1 }, { unique: true });
fitnessDailyLogSchema.index({ coupleId: 1, date: -1 });

module.exports = mongoose.model('FitnessDailyLog', fitnessDailyLogSchema);
