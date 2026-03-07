// ============================================================
// Inquiry.js — A contact form submission about a property
// ============================================================

const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
  {
    // Which property the inquiry is about
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },

    // Which agent will receive this inquiry
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Contact info from the person asking (they might not be logged in)
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    message: { type: String, required: true },

    // If the user is logged in, we store their ID
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Has the agent responded yet?
    status: {
      type: String,
      enum: ['new', 'read', 'replied'],
      default: 'new',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Inquiry', inquirySchema);
