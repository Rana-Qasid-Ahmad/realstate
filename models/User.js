<<<<<<< HEAD
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['buyer', 'agent', 'admin'], default: 'buyer' },
  phone: { type: String },
  avatar: { type: String, default: '' },
  bio: { type: String },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  verificationCode: { type: String },
  verificationCodeExpiry: { type: Date },
  savedProperties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
=======
// ============================================================
// User.js — The User database model
// A "model" defines what a user looks like in the database
// ============================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define the shape/structure of a user document
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,   // This field is required
      trim: true,       // Removes extra spaces from start/end
    },
    email: {
      type: String,
      required: true,
      unique: true,     // No two users can have the same email
      lowercase: true,  // Always saves email in lowercase
    },
    password: {
      type: String,
      required: true,
      minlength: 6,     // Password must be at least 6 characters
    },
    role: {
      type: String,
      enum: ['buyer', 'agent', 'admin'], // Only these 3 values are allowed
      default: 'buyer',                  // New users are buyers by default
    },
    phone: {
      type: String,
    },
    avatar: {
      type: String,
      default: '',      // Empty string means no avatar yet
    },
    bio: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,    // Accounts are active by default
    },

    // Email verification fields
    isVerified: {
      type: Boolean,
      default: false,   // New users are not verified yet
    },
    verificationCode: {
      type: String,     // The 6-digit code we email them
    },
    verificationCodeExpiry: {
      type: Date,       // When the code expires (15 minutes after sending)
    },

    // Array of property IDs that the buyer has saved/bookmarked
    savedProperties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',  // This links to the Property model
      }
    ],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// -------------------------------------------------------
// Before saving a user, hash their password
// This runs automatically whenever we call user.save()
// We NEVER store plain text passwords in the database
// -------------------------------------------------------
userSchema.pre('save', async function (next) {
  // Only hash the password if it was changed (not on every save)
  if (!this.isModified('password')) {
    return next();
  }

  // Hash the password with a "salt rounds" of 12
  // Higher number = more secure but slower
  this.password = await bcrypt.hash(this.password, 12);

  next();
});

// -------------------------------------------------------
// Method to check if a password is correct during login
// Usage: const isMatch = await user.comparePassword('mypassword')
// -------------------------------------------------------
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
};

module.exports = mongoose.model('User', userSchema);
