// ============================================================
// SavedProperty.js — Replaces savedProperties array in User
//
// WHY: Storing saves as an array inside User means:
//   - Every User load fetches ALL saved IDs (even 500+ of them)
//   - Updating saves requires loading + modifying the whole User
//   - Can't query "which users saved property X" efficiently
//
// With a separate collection:
//   - O(1) lookup by userId index
//   - User document stays lean
//   - Can add metadata (savedAt, notes) easily later
// ============================================================

const mongoose = require('mongoose');

const savedPropertySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate saves + fast lookup
savedPropertySchema.index({ user: 1, property: 1 }, { unique: true });

// Fast "get all saved by user" query
savedPropertySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SavedProperty', savedPropertySchema);
