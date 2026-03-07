<<<<<<< HEAD
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
=======
// ============================================================
// auth.js — All authentication routes
// ============================================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/email');

<<<<<<< HEAD
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

=======

// -------------------------------------------------------
// Helper: create a JWT token for a user
// The token contains the user's ID and expires in 30 days
// -------------------------------------------------------
function createToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// -------------------------------------------------------
// Helper: generate a random 6-digit number as a string
// Example output: "482910"
// -------------------------------------------------------
function generateCode() {
  const code = Math.floor(100000 + Math.random() * 900000);
  return code.toString();
}

// -------------------------------------------------------
// Helper: check if validation failed and send the error
// Returns the error response, or null if everything is fine
// -------------------------------------------------------
function checkValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Send back just the first error message (keeps it simple)
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  return null;
}

// -------------------------------------------------------
// Helper: save a new code on the user and email it to them
// Used by both resend-code and forgot-password
// -------------------------------------------------------
async function sendCodeToUser(user) {
  const newCode = generateCode();
  const fifteenMinutes = new Date(Date.now() + 15 * 60 * 1000);

  user.verificationCode = newCode;
  user.verificationCodeExpiry = fifteenMinutes;
  await user.save();

  // Try to send the email — don't crash if it fails
  try {
    await sendVerificationEmail(user.email, user.name, newCode);
  } catch (emailError) {
    console.log('Email sending failed:', emailError.message);
  }

  return newCode;
}


// ============================================================
// POST /api/auth/register
// Create a new account and send a verification email
// ============================================================
router.post(
  '/register',
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Please enter a valid email.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  async (req, res) => {
    // Stop here if validation failed
    const validationError = checkValidation(req, res);
    if (validationError) return validationError;

    try {
      const { name, email, password, role, phone } = req.body;

      // Check if this email is already taken
      const existingUser = await User.findOne({ email: email });
      if (existingUser) {
        return res.status(400).json({ message: 'This email is already registered.' });
      }

      // Only allow buyer and agent roles — not admin
      const allowedRoles = ['buyer', 'agent'];
      const userRole = allowedRoles.includes(role) ? role : 'buyer';

      // Create the user (password gets hashed automatically by the User model)
      const newUser = await User.create({
        name: name,
        email: email,
        password: password,
        role: userRole,
        phone: phone,
        isVerified: false,
      });

      // Send the verification code
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
// Check the 6-digit code the user typed in
// ============================================================
router.post('/verify-email', async (req, res) => {
  try {
    const { userId, code } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified.' });
    }

    // Check the code matches what we stored
    if (user.verificationCode !== code.trim()) {
      return res.status(400).json({ message: 'Incorrect verification code.' });
    }

    // Check the code hasn't expired
    const now = new Date();
    if (now > user.verificationCodeExpiry) {
      return res.status(400).json({ message: 'Code has expired. Please request a new one.' });
    }

    // Mark as verified and clear the code fields
>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpiry = undefined;
    await user.save();

<<<<<<< HEAD
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
=======
    // Log them in immediately by sending a token
    const token = createToken(user._id);

    res.json({
      token: token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: true,
      },
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// POST /api/auth/resend-code
// Send a fresh verification code to the user
// ============================================================
router.post('/resend-code', async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified.' });
    }

    // Rate limit: block resend if the last code was sent less than 60 seconds ago
    if (user.verificationCodeExpiry) {
      const codeCreatedAt = user.verificationCodeExpiry.getTime() - (15 * 60 * 1000);
      const secondsSinceLastSend = (Date.now() - codeCreatedAt) / 1000;

      if (secondsSinceLastSend < 60) {
        return res.status(429).json({
          message: 'Please wait 60 seconds before requesting a new code.',
        });
      }
    }

    await sendCodeToUser(user);

    res.json({ message: 'A new code has been sent to your email.' });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// POST /api/auth/login
// Log in with email and password
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

      // Find the user by email
      const user = await User.findOne({ email: email });

      // Don't tell them which one is wrong (email or password) — security best practice
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const passwordIsCorrect = await user.comparePassword(password);
      if (!passwordIsCorrect) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      // Check if account was deactivated by admin
      if (!user.isActive) {
        return res.status(403).json({ message: 'Your account has been deactivated.' });
      }

      // If not verified, send a fresh code and redirect to verify page
      if (!user.isVerified) {
        await sendCodeToUser(user);

        return res.status(403).json({
          message: 'Please verify your email first. We sent a new code.',
          unverified: true,
          userId: user._id,
          email: user.email,
        });
      }

      // All good — send the token
      const token = createToken(user._id);

      res.json({
        token: token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          isVerified: user.isVerified,
        },
      });

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);


// ============================================================
// POST /api/auth/forgot-password
// Step 1: User enters their email → we send them a reset code
// ============================================================
router.post(
  '/forgot-password',
  body('email').isEmail().withMessage('Please enter a valid email.').normalizeEmail(),
  async (req, res) => {
    const validationError = checkValidation(req, res);
    if (validationError) return validationError;

    try {
      const { email } = req.body;

      const user = await User.findOne({ email: email });

      // IMPORTANT: Always return the same message whether or not the email exists
      // This prevents attackers from finding out which emails are registered
      if (!user) {
        return res.json({
          message: 'If that email is registered, a reset code has been sent.',
        });
      }

      // Send the reset code to their email
      await sendCodeToUser(user);

      res.json({
        message: 'If that email is registered, a reset code has been sent.',
        userId: user._id, // Frontend needs this to submit the new password
      });

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);


// ============================================================
// POST /api/auth/reset-password
// Step 2: User enters the code + new password
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

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      // Check the code matches
      if (user.verificationCode !== code.trim()) {
        return res.status(400).json({ message: 'Incorrect reset code.' });
      }

      // Check the code hasn't expired
      const now = new Date();
      if (now > user.verificationCodeExpiry) {
        return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
      }

      // Set the new password — the User model will hash it automatically on save
      user.password = password;
      user.verificationCode = undefined;
      user.verificationCodeExpiry = undefined;
      await user.save();

      res.json({ message: 'Password reset successfully. You can now log in.' });

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);


// ============================================================
// GET /api/auth/me
// Get the currently logged in user's data
// ============================================================
router.get('/me', protect, async (req, res) => {
  // The protect middleware already found the user and attached it to req.user
  res.json(req.user);
});


// ============================================================
// PUT /api/auth/profile
// Update the logged in user's profile info
// ============================================================
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, bio } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name: name, phone: phone, bio: bio },
      { new: true }       // Return the updated document, not the old one
    ).select('-password'); // Never include the password in responses

    res.json(updatedUser);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// PUT /api/auth/saved/:propertyId
// Toggle save / unsave a property for the logged in user
// ============================================================
router.put('/saved/:propertyId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const propertyId = req.params.propertyId;

    // Check if already saved
    const alreadySaved = user.savedProperties.includes(propertyId);

    if (alreadySaved) {
      // Remove it
      user.savedProperties = user.savedProperties.filter(
        (id) => id.toString() !== propertyId
      );
    } else {
      // Add it
      user.savedProperties.push(propertyId);
    }

    await user.save();

    res.json({ savedProperties: user.savedProperties });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
