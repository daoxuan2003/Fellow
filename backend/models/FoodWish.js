// ============================================
// 想吃清单模型
// ============================================

const mongoose = require('mongoose');

const foodWishSchema = new mongoose.Schema({
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
  whyWeWant: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('FoodWish', foodWishSchema);
