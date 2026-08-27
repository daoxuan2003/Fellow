// ============================================
// 取件地点模型（情侣共享）
// ============================================

const mongoose = require('mongoose');

const pickupLocationSchema = new mongoose.Schema({
  coupleId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  renameStatus: {
    type: String,
    enum: ['pending', 'compensating', 'ready'],
    default: 'ready'
  },
  renameRequestId: { type: String, default: undefined, maxlength: 80, select: false },
  renamePreviousName: { type: String, default: undefined, select: false },
  renameNextName: { type: String, default: undefined, select: false },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 复合索引：每对情侣的地点名唯一
pickupLocationSchema.index({ coupleId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('PickupLocation', pickupLocationSchema);
