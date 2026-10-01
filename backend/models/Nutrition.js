const mongoose = require('mongoose');
const { Schema } = mongoose;
const actor = { coupleId: { type: String, required: true }, userId: { type: String, required: true } };
const profileSchema = new Schema({
  ...actor,
  sex: { type: String, enum: ['female', 'male'], required: true },
  age: Number, height: Number, baselineWeight: Number, waist: Number, thigh: Number, hip: Number, bodyFat: Number,
  goal: { type: String, enum: ['fat_loss', 'maintain', 'gain', 'recomp'], required: true },
  protein: Number, fiber: Number,
  needsClinicalAdvice: { type: Boolean, default: false },
  calibrationStart: String, calibrationDays: { type: Number, default: 7 },
  targetCalories: { type: Number, default: null }, maintenance: { type: Number, default: null }, targetSince: String,
  privacy: {
    completion: { type: Boolean, default: true }, calories: { type: Boolean, default: true },
    foods: { type: Boolean, default: false }, weight: { type: Boolean, default: false },
    waist: { type: Boolean, default: false }, thigh: { type: Boolean, default: false }
  },
  allowSharedMeals: { type: Boolean, default: false },
  allowPartnerAiMeals: { type: Boolean, default: false }, favorites: [String],
  revision: { type: Number, default: 0 }
}, { timestamps: true });
profileSchema.index({ coupleId: 1, userId: 1 }, { unique: true });

const daySchema = new Schema({
  ...actor, date: { type: String, required: true }, weight: { type: Number, default: null },
  waist: { type: Number, default: null }, thigh: { type: Number, default: null },
  recovery: { type: String, enum: ['normal', 'poor', 'unknown'], default: 'unknown' },
  fullDayConfirmedAt: { type: Date, default: null },
  confirmedFingerprint: { type: String, default: null },
  walks: [{ _id: false, meal: String, startedAt: Date, completedAt: { type: Date, default: null } }]
}, { timestamps: true });
daySchema.index({ coupleId: 1, userId: 1, date: 1 }, { unique: true });

const nutrients = new Schema({ calories: Number, protein: Number, carbs: Number, fat: Number, fiber: { type: Number, default: null } }, { _id: false });
const foodFields = {
  name: String, category: String, unit: String, weightType: String,
  per100: nutrients, source: String, sourceUrl: String
};
const snapshot = new Schema({ ...foodFields, foodId: String, amount: Number }, { _id: false });
const entrySchema = new Schema({
  coupleId: { type: String, required: true }, creatorId: { type: String, required: true },
  requestId: { type: String, required: true }, requestHash: String,
  date: { type: String, required: true }, meal: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], required: true },
  name: String, shared: Boolean,
  // Validated server-side state; never accept raw model/request objects here.
  ai: { type: Schema.Types.Mixed, default: undefined },
  aiBeforeImage: { type: String, select: false },
  portions: [{ _id: false, userId: { type: String, required: true }, foods: [snapshot] }],
  deleted: { type: Boolean, default: false }, revision: { type: Number, default: 0 }
}, { timestamps: true });
entrySchema.index({ coupleId: 1, creatorId: 1, requestId: 1 }, { unique: true });
entrySchema.index({ coupleId: 1, 'portions.userId': 1, date: -1 });
const foodSchema = new Schema({ ...actor, ...foodFields }, { timestamps: true });
foodSchema.index({ coupleId: 1, userId: 1 });
const templateSchema = new Schema({ ...actor, name: String, foods: [snapshot] }, { timestamps: true });
templateSchema.index({ coupleId: 1, userId: 1 });
module.exports = {
  NutritionProfile: mongoose.model('NutritionProfile', profileSchema),
  NutritionDay: mongoose.model('NutritionDay', daySchema),
  NutritionEntry: mongoose.model('NutritionEntry', entrySchema),
  NutritionFood: mongoose.model('NutritionFood', foodSchema),
  NutritionTemplate: mongoose.model('NutritionTemplate', templateSchema)
};
