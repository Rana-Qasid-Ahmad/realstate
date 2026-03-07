<<<<<<< HEAD
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });
=======
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
>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4

module.exports = mongoose.model('Message', messageSchema);
