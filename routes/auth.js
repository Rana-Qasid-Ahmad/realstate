// ============================================================
// auth.js — Authentication routes (queue-based emails)
// ============================================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const SavedProperty = require('../models/SavedProperty');
const { protect, invalidateUserCache } = require('../middleware/auth');
const { queueVerificationEmail } = require('../config/emailQueue');

function createToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function checkValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  return null;
}

async function sendCodeToUser(user) {
  const newCode = generateCode();
  user.verificationCode = newCode;
  user.verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();
  // Non-blocking — queued to background worker
  await queueVerificationEmail(user.email, user.name, newCode).catch(() => {});
  return newCode;
}

// ============================================================
// POST /api/auth/register
// ============================================================
router.post(
  '/register',
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Please enter a valid email.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  async (req, res) => {
    const validationError = checkValidation(req, res);
    if (validationError) return validationError;

    try {
      const { name, email, password, role, phone } = req.body;

      const existingUser = await User.findOne({ email }).lean();
      if (existingUser) return res.status(400).json({ message: 'This email is already registered.' });

      const allowedRoles = ['buyer', 'agent'];
      const userRole = allowedRoles.includes(role) ? role : 'buyer';

      const newUser = await User.create({ name, email, password, role: userRole, phone, isVerified: false });
      await sendCodeToUser(newUser);

      res.status(201).json({
        message: 'Account created! Check your email for the verification code.',
        userId: newUser._id,
        email: newUser.email,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// ============================================================
// POST /api/auth/verify-email
// ============================================================
router.post('/verify-email', async (req, res) => {
  try {
    const { userId, code } = req.body;
    // Need verificationCode fields (normally select:false)
    const user = await User.findById(userId).select('+verificationCode +verificationCodeExpiry');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.isVerified) return res.status(400).json({ message: 'Email is already verified.' });
    if (user.verificationCode !== code.trim()) return res.status(400).json({ message: 'Incorrect verification code.' });
    if (new Date() > user.verificationCodeExpiry) return res.status(400).json({ message: 'Code has expired. Please request a new one.' });

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpiry = undefined;
    await user.save();

    const token = createToken(user._id);
    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, isVerified: true },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// POST /api/auth/resend-code
// ============================================================
router.post('/resend-code', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId).select('+verificationCode +verificationCodeExpiry');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.isVerified) return res.status(400).json({ message: 'Email is already verified.' });

    if (user.verificationCodeExpiry) {
      const secondsSinceSend = (Date.now() - (user.verificationCodeExpiry.getTime() - 15 * 60 * 1000)) / 1000;
      if (secondsSinceSend < 60) return res.status(429).json({ message: 'Please wait 60 seconds before requesting a new code.' });
    }

    await sendCodeToUser(user);
    res.json({ message: 'A new code has been sent to your email.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// POST /api/auth/login
// ============================================================
router.post(
  '/login',
  body('email').isEmail().withMessage('Please enter a valid email.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
  async (req, res) => {
    const validationError = checkValidation(req, res);
    if (validationError) return validationError;

    try {
      const { email, password } = req.body;
      // Need password field (select:false by default)
      const user = await User.findOne({ email }).select('+password');

      if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

      const passwordIsCorrect = await user.comparePassword(password);
      if (!passwordIsCorrect) return res.status(401).json({ message: 'Invalid email or password.' });

      if (!user.isActive) return res.status(403).json({ message: 'Your account has been deactivated.' });

      if (!user.isVerified) {
        await sendCodeToUser(user);
        return res.status(403).json({
          message: 'Please verify your email first. We sent a new code.',
          unverified: true,
          userId: user._id,
          email: user.email,
        });
      }

      const token = createToken(user._id);
      res.json({
        token,
        user: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, isVerified: user.isVerified },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// ============================================================
// POST /api/auth/forgot-password
// ============================================================
router.post(
  '/forgot-password',
  body('email').isEmail().withMessage('Please enter a valid email.').normalizeEmail(),
  async (req, res) => {
    const validationError = checkValidation(req, res);
    if (validationError) return validationError;
    try {
      const user = await User.findOne({ email: req.body.email }).select('+verificationCode +verificationCodeExpiry');
      if (user) await sendCodeToUser(user);
      // Always return same message (prevents email enumeration attack)
      res.json({ message: 'If that email is registered, a reset code has been sent.', userId: user?._id });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// ============================================================
// POST /api/auth/reset-password
// ============================================================
router.post(
  '/reset-password',
  body('code').notEmpty().withMessage('Reset code is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  async (req, res) => {
    const validationError = checkValidation(req, res);
    if (validationError) return validationError;
    try {
      const { userId, code, password } = req.body;
      const user = await User.findById(userId).select('+verificationCode +verificationCodeExpiry');
      if (!user) return res.status(404).json({ message: 'User not found.' });
      if (user.verificationCode !== code.trim()) return res.status(400).json({ message: 'Incorrect reset code.' });
      if (new Date() > user.verificationCodeExpiry) return res.status(400).json({ message: 'Reset code has expired.' });

      user.password = password;
      user.verificationCode = undefined;
      user.verificationCodeExpiry = undefined;
      await user.save();

      // Invalidate cached user so next request gets fresh data
      await invalidateUserCache(userId);

      res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// ============================================================
// GET /api/auth/me
// ============================================================
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// ============================================================
// PUT /api/auth/profile
// ============================================================
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, bio } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, bio },
      { new: true }
    ).select('-password').lean();

    // Bust cache so subsequent requests get updated name/bio
    await invalidateUserCache(req.user._id);
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// PUT /api/auth/saved/:propertyId — Toggle save (new collection)
// ============================================================
router.put('/saved/:propertyId', protect, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user._id;

    const existing = await SavedProperty.findOne({ user: userId, property: propertyId });

    if (existing) {
      await existing.deleteOne();
    } else {
      await SavedProperty.create({ user: userId, property: propertyId });
    }

    // Return list of saved property IDs for frontend to update UI
    const saved = await SavedProperty.find({ user: userId }).select('property').lean();
    res.json({ savedProperties: saved.map(s => s.property) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// GET /api/auth/saved — Get all saved properties for user
// ============================================================
router.get('/saved', protect, async (req, res) => {
  try {
    const saved = await SavedProperty.find({ user: req.user._id })
      .populate({
        path: 'property',
        populate: { path: 'agent', select: 'name avatar' },
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json(saved.map(s => s.property).filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
