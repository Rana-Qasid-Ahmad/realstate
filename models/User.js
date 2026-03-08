// ============================================================
// User.js — with indexes and savedProperties moved out
// ============================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ['buyer', 'agent', 'admin'],
      default: 'buyer',
    },
    phone: { type: String },
    avatar: { type: String, default: '' },
    bio: { type: String },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },

    // Kept select:false so these NEVER appear in API responses
    verificationCode: { type: String, select: false },
    verificationCodeExpiry: { type: Date, select: false },

    // NOTE: savedProperties moved to SavedProperty collection (see models/SavedProperty.js)
    // Keeping this field empty for backward compat but no longer used
    savedProperties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  },
  { timestamps: true }
);

// Index for admin user search
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

// Auto-hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
