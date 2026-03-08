// ============================================================
// Message.js — with index on conversation+createdAt
// ============================================================

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: { type: String, required: true, trim: true, maxlength: 5000 },

    // Simplified from array to boolean — for 1-on-1 chat this is sufficient
    // and avoids an ever-growing array on every message document
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

// Critical index: fetching messages for a conversation in order
// Without this, MongoDB scans ALL messages to find ones in a conversation
messageSchema.index({ conversation: 1, createdAt: 1 });

// For unread count queries
messageSchema.index({ conversation: 1, isRead: 1 });

module.exports = mongoose.model('Message', messageSchema);
