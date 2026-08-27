const mongoose = require('mongoose');

const relationshipStateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  filter: { type: mongoose.Schema.Types.Mixed, required: true },
  previous: { type: mongoose.Schema.Types.Mixed, required: true },
  next: { type: mongoose.Schema.Types.Mixed, required: true }
}, { _id: false });

const relationshipMutationSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true, maxlength: 80 },
  action: {
    type: String,
    enum: ['invite_send', 'invite_accept', 'invite_reject', 'invite_cancel', 'unbind'],
    required: true
  },
  actorId: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ['pending', 'compensating', 'ready'],
    default: 'pending'
  },
  states: { type: [relationshipStateSchema], required: true },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: undefined }
}, { collection: 'relationship_mutations' });

relationshipMutationSchema.index({ actorId: 1, createdAt: -1 });

module.exports = mongoose.model('RelationshipMutation', relationshipMutationSchema);
