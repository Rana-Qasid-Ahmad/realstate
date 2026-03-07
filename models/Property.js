const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  type: { type: String, enum: ['house', 'apartment', 'villa', 'commercial', 'plot'], required: true },
  status: { type: String, enum: ['sale', 'rent'], required: true },
  bedrooms: { type: Number, default: 0 },
  bathrooms: { type: Number, default: 0 },
  area: { type: Number, required: true }, // in sq ft
  images: [{ type: String }],
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    country: { type: String, default: 'Pakistan' },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  features: [{ type: String }], // e.g. ['Parking', 'Garden', 'Pool']
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isApproved: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
}, { timestamps: true });

// Text search index
propertySchema.index({ title: 'text', 'location.city': 'text', 'location.address': 'text' });

module.exports = mongoose.model('Property', propertySchema);
