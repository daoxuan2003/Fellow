const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true, maxlength: 40 },
  createdBy: { type: String, required: true }
}, { _id: false });
const drawSchema = new mongoose.Schema({
  requestId: String, entryId: String, label: String, drawnBy: String, drawnAt: Date
}, { _id: false });
const schema = new mongoose.Schema({
  coupleId: { type: String, required: true },
  category: { type: String, enum: ['special', 'everyday', 'outing'], required: true },
  entries: { type: [entrySchema], default: [] },
  revision: { type: Number, default: 0 },
  lastDraw: { type: drawSchema, default: null }
}, { timestamps: true });
schema.index({ coupleId: 1, category: 1 }, { unique: true });
module.exports = mongoose.model('DecisionWheel', schema);
