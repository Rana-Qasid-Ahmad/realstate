<<<<<<< HEAD
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  lastMessageAt: { type: Date, default: Date.now },
  unreadCount: {
    type: Map,
    of: Number,
    default: {},
  },
}, { timestamps: true });
=======
// ============================================================
// Conversation.js — A chat thread between two users
// ============================================================

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // The two users in this conversation
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      }
    ],

    // Optional: which property this conversation is about
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
    },

    // The most recent message (for showing preview in inbox)
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },

    // When the last message was sent (for sorting inbox)
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },

    // How many unread messages each user has
    // Map lets us store dynamic keys like: { "userId123": 3, "userId456": 0 }
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);
>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4

module.exports = mongoose.model('Conversation', conversationSchema);
