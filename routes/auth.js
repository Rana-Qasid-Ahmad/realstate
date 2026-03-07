const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/email');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// @POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const allowedRoles = ['buyer', 'agent'];
    const userRole = allowedRoles.includes(role) ? role : 'buyer';

    const code = generateCode();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const user = await User.create({
      name, email, password, role: userRole, phone,
      verificationCode: code,
      verificationCodeExpiry: expiry,
      isVerified: false,
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, name, code);
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
      // Don't block registration if email fails — just log it
    }

    res.status(201).json({
      message: 'Registration successful. Please check your email for the verification code.',
      userId: user._id,
      email: user.email,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { userId, code } = req.body;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Email already verified' });

    if (!user.verificationCode || user.verificationCode !== code.trim()) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (new Date() > user.verificationCodeExpiry) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpiry = undefined;
    await user.save();

    res.json({
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, isVerified: true },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @POST /api/auth/resend-code
router.post('/resend-code', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Email already verified' });

    // Rate limit: don't resend if last code was sent less than 60 seconds ago
    if (user.verificationCodeExpiry) {
      const timeLeft = user.verificationCodeExpiry - Date.now();
      const totalWindow = 15 * 60 * 1000;
      if (timeLeft > totalWindow - 60 * 1000) {
        return res.status(429).json({ message: 'Please wait 60 seconds before requesting a new code.' });
      }
    }

    const code = generateCode();
    user.verificationCode = code;
    user.verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(user.email, user.name, code);

    res.json({ message: 'A new verification code has been sent to your email.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.isActive) return res.status(403).json({ message: 'Account has been deactivated' });
    if (!user.isVerified) {
      // Resend a fresh code and tell frontend to go to verify page
      const code = generateCode();
      user.verificationCode = code;
      user.verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      try { await sendVerificationEmail(user.email, user.name, code); } catch {}
      return res.status(403).json({
        message: 'Please verify your email first. We sent a new code.',
        unverified: true,
        userId: user._id,
        email: user.email,
      });
    }

    res.json({
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, isVerified: user.isVerified },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// @PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, bio } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, phone, bio }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/auth/saved/:propertyId
router.put('/saved/:propertyId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const propId = req.params.propertyId;
    const idx = user.savedProperties.indexOf(propId);
    if (idx === -1) { user.savedProperties.push(propId); } else { user.savedProperties.splice(idx, 1); }
    await user.save();
    res.json({ savedProperties: user.savedProperties });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
