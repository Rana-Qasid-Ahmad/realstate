<<<<<<< HEAD
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
=======
// ============================================================
// Property.js — The Property database model
// ============================================================

const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['house', 'apartment', 'villa', 'commercial', 'plot'],
      required: true,
    },
    status: {
      type: String,
      enum: ['sale', 'rent'], // Is this property for sale or for rent?
      required: true,
    },
    bedrooms: {
      type: Number,
      default: 0,
    },
    bathrooms: {
      type: Number,
      default: 0,
    },
    area: {
      type: Number,
      required: true, // Area in square feet
    },

    // Array of image URLs (stored on Cloudinary)
    images: [
      { type: String }
    ],

    // Location is a nested object (object inside an object)
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

    // Array of feature strings like ['Parking', 'Garden', 'Pool']
    features: [
      { type: String }
    ],

    // The agent who listed this property
    // ObjectId is like a "foreign key" — it links to a User document
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Tells Mongoose to look in the User collection
      required: true,
    },

    // Admin must approve before it shows on the site
    isApproved: {
      type: Boolean,
      default: false,
    },

    // Featured properties appear on the home page
    isFeatured: {
      type: Boolean,
      default: false,
    },

    // How many times someone has viewed this property
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Create a text search index so users can search by title, city, address
>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
propertySchema.index({ title: 'text', 'location.city': 'text', 'location.address': 'text' });

module.exports = mongoose.model('Property', propertySchema);
