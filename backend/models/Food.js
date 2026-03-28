// ============================================
// 美食记录模型
// ============================================

const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  coupleId: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  restaurant: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  whatWeAte: [{
    type: String
  }],
  howWasIt: {
    type: String,
    default: ''
  },
  wantToGoAgain: {
    type: Boolean,
    default: false
  },
  isOurFavorite: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    default: ''
  },
  photos: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

foodSchema.index({ coupleId: 1, date: -1 });

module.exports = mongoose.model('Food', foodSchema);
