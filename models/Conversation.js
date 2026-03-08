// ============================================================
// Conversation.js — with indexes for inbox queries
// ============================================================

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      }
    ],
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

// Critical: fetching inbox for a user sorted by most recent
// Without this index, every inbox load scans ALL conversations
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

// Unique conversation lookup (don't create duplicate convos)
conversationSchema.index({ participants: 1, property: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
