// ============================================================
// auth.js — Routes for registration, login, verification
// ============================================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/email');

// Helper: create a JWT token for a user
// The token contains the user's ID and expires in 30 days
function createToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// Helper: generate a random 6-digit number as a string
function generateVerificationCode() {
  const code = Math.floor(100000 + Math.random() * 900000);
  return code.toString();
}


// ============================================================
// POST /api/auth/register
// Create a new account and send a verification email
// ============================================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Check if someone already registered with this email
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({ message: 'This email is already registered.' });
    }

    // Only allow buyers and agents to register (not admins)
    const allowedRoles = ['buyer', 'agent'];
    const userRole = allowedRoles.includes(role) ? role : 'buyer';

    // Create the verification code and set it to expire in 15 minutes
    const verificationCode = generateVerificationCode();
    const fifteenMinutesFromNow = new Date(Date.now() + 15 * 60 * 1000);

    // Create the user in the database
    // The password will be hashed automatically by the User model
    const newUser = await User.create({
      name: name,
      email: email,
      password: password,
      role: userRole,
      phone: phone,
      verificationCode: verificationCode,
      verificationCodeExpiry: fifteenMinutesFromNow,
      isVerified: false,
    });

    // Try to send the verification email
    // We use try/catch so if email fails, registration still works
    try {
      await sendVerificationEmail(email, name, verificationCode);
    } catch (emailError) {
      console.log('Email sending failed:', emailError.message);
    }

    // Send back the userId and email so the frontend can show the verify page
    res.status(201).json({
      message: 'Account created! Check your email for the verification code.',
      userId: newUser._id,
      email: newUser.email,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// POST /api/auth/verify-email
// Check the 6-digit code the user entered
// ============================================================
router.post('/verify-email', async (req, res) => {
  try {
    const { userId, code } = req.body;

    // Find the user by their ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified.' });
    }

    // Check if the code matches
    if (user.verificationCode !== code.trim()) {
      return res.status(400).json({ message: 'Incorrect verification code.' });
    }

    // Check if the code has expired
    const now = new Date();
    if (now > user.verificationCodeExpiry) {
      return res.status(400).json({ message: 'Code has expired. Please request a new one.' });
    }

    // Mark the user as verified and clear the code fields
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpiry = undefined;
    await user.save();

    // Log them in by sending back a token
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
// Send a fresh verification code to the user's email
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

    // Rate limit: don't allow resend if the current code is less than 60 seconds old
    if (user.verificationCodeExpiry) {
      const codeAge = Date.now() - (user.verificationCodeExpiry - 15 * 60 * 1000);
      if (codeAge < 60 * 1000) {
        return res.status(429).json({ message: 'Please wait 60 seconds before requesting a new code.' });
      }
    }

    // Generate a fresh code
    const newCode = generateVerificationCode();
    user.verificationCode = newCode;
    user.verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(user.email, user.name, newCode);

    res.json({ message: 'A new code has been sent to your email.' });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// POST /api/auth/login
// Log in with email and password
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email: email });

    // If no user found or password is wrong, send the same error
    // (We don't tell them WHICH one is wrong for security reasons)
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const passwordIsCorrect = await user.comparePassword(password);
    if (!passwordIsCorrect) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Check if the account is active (not banned)
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated.' });
    }

    // Check if the email is verified
    if (!user.isVerified) {
      // Send them a fresh code and redirect them to the verify page
      const newCode = generateVerificationCode();
      user.verificationCode = newCode;
      user.verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();

      try {
        await sendVerificationEmail(user.email, user.name, newCode);
      } catch (emailError) {
        console.log('Email failed:', emailError.message);
      }

      return res.status(403).json({
        message: 'Please verify your email. We sent a new code.',
        unverified: true,
        userId: user._id,
        email: user.email,
      });
    }

    // Everything is good — create a token and send it back
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
});


// ============================================================
// GET /api/auth/me
// Get the currently logged in user's info
// ============================================================
router.get('/me', protect, async (req, res) => {
  // protect middleware already found and attached the user
  // so we just send it back
  res.json(req.user);
});


// ============================================================
// PUT /api/auth/profile
// Update the logged in user's profile
// ============================================================
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, bio } = req.body;

    // Find the user and update their info
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name: name, phone: phone, bio: bio },
      { new: true }  // return the UPDATED document, not the old one
    ).select('-password');  // don't include the password in the response

    res.json(updatedUser);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// PUT /api/auth/saved/:propertyId
// Toggle save/unsave a property for the logged in user
// ============================================================
router.put('/saved/:propertyId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const propertyId = req.params.propertyId;

    // Check if this property is already saved
    const alreadySaved = user.savedProperties.includes(propertyId);

    if (alreadySaved) {
      // Remove it from saved
      user.savedProperties = user.savedProperties.filter(
        (id) => id.toString() !== propertyId
      );
    } else {
      // Add it to saved
      user.savedProperties.push(propertyId);
    }

    await user.save();

    res.json({ savedProperties: user.savedProperties });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
