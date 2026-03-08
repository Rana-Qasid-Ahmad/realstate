// ============================================================
// Inquiry.js — with indexes for agent inbox queries
// ============================================================

const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true },
    phone: { type: String },
    message: { type: String, required: true, trim: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['new', 'read', 'replied'], default: 'new' },
  },
  { timestamps: true }
);

// Agent inbox: "show me all inquiries for my listings, newest first"
inquirySchema.index({ agent: 1, createdAt: -1 });
inquirySchema.index({ agent: 1, status: 1 });

module.exports = mongoose.model('Inquiry', inquirySchema);
