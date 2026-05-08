// ============================================
// 汇率缓存模型
// ============================================

const mongoose = require('mongoose');

const exchangeRateSchema = new mongoose.Schema({
  base: { type: String, required: true, maxlength: 10 },
  target: { type: String, required: true, maxlength: 10 },
  rate: { type: Number, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  updatedAt: { type: Date, default: Date.now }
});

exchangeRateSchema.index({ base: 1, target: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ExchangeRate', exchangeRateSchema);
