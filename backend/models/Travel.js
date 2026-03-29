// ============================================
// 旅行记录模型
// ============================================

const mongoose = require('mongoose');

const travelSchema = new mongoose.Schema({
  coupleId: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  country: {
    type: String,
    default: '中国'
  },
  date: {
    type: Date,
    required: true
  },
  photos: [{
    type: String
  }],
  memory: {
    type: String,
    default: ''
  },
  highlights: [{
    type: String
  }],
  weather: {
    type: String,
    default: ''
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

travelSchema.index({ coupleId: 1, date: -1 });

module.exports = mongoose.model('Travel', travelSchema);
