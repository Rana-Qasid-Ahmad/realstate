// ============================================================
// Message.js — A single chat message
// ============================================================

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    // Which conversation this message belongs to
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },

    // Who sent this message
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // The actual message text
    text: {
      type: String,
      required: true,
      trim: true,
    },

    // Array of user IDs who have read this message
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
  },
  {
    timestamps: true, // createdAt = when the message was sent
  }
);

module.exports = mongoose.model('Message', messageSchema);
