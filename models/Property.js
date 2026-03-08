// ============================================================
// Property.js — Property model with production indexes
// ============================================================

const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    type: {
      type: String,
      enum: ['house', 'apartment', 'villa', 'commercial', 'plot'],
      required: true,
    },
    status: { type: String, enum: ['sale', 'rent'], required: true },
    bedrooms: { type: Number, default: 0 },
    bathrooms: { type: Number, default: 0 },
    area: { type: Number, required: true },
    images: [{ type: String }],
    location: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String },
      country: { type: String, default: 'Pakistan' },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    features: [{ type: String }],
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isApproved: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// -------------------------------------------------------
// TEXT INDEX — full-text search on title, city, address
// -------------------------------------------------------
propertySchema.index({ title: 'text', 'location.city': 'text', 'location.address': 'text' });

// -------------------------------------------------------
// COMPOUND INDEXES — these are the critical ones for scale
//
// Rule: indexes must match your most common query patterns.
// Every filter combo on the /api/properties endpoint is covered.
// -------------------------------------------------------

// Default listing page: approved + sort by date
propertySchema.index({ isApproved: 1, createdAt: -1 });

// Filter by city
propertySchema.index({ isApproved: 1, 'location.city': 1, createdAt: -1 });

// Filter by type + status (most common filter combo)
propertySchema.index({ isApproved: 1, type: 1, status: 1, createdAt: -1 });

// Price range queries
propertySchema.index({ isApproved: 1, price: 1 });

// Bedroom filter
propertySchema.index({ isApproved: 1, bedrooms: 1 });

// Featured properties (home page)
propertySchema.index({ isApproved: 1, isFeatured: 1, createdAt: -1 });

// Sort by views (popular)
propertySchema.index({ isApproved: 1, views: -1 });

// Agent's own listings
propertySchema.index({ agent: 1, createdAt: -1 });

// Admin panel: pending properties
propertySchema.index({ isApproved: 1, isFeatured: 1 });

module.exports = mongoose.model('Property', propertySchema);
