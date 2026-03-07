// ============================================================
// admin.js — Routes only accessible by admins
// ============================================================

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Property = require('../models/Property');
const Inquiry = require('../models/Inquiry');
const { protect, authorize } = require('../middleware/auth');

// Apply protect + authorize to ALL routes in this file
// This means every route below requires an admin token
router.use(protect, authorize('admin'));


// ============================================================
// GET /api/admin/stats
// Dashboard summary numbers
// ============================================================
router.get('/stats', async (req, res) => {
  try {
    // Run all 5 count queries at the same time using Promise.all
    const totalBuyers = await User.countDocuments({ role: 'buyer' });
    const totalAgents = await User.countDocuments({ role: 'agent' });
    const totalApprovedProperties = await Property.countDocuments({ isApproved: true });
    const pendingApprovalCount = await Property.countDocuments({ isApproved: false });
    const totalInquiries = await Inquiry.countDocuments();

    res.json({
      totalUsers: totalBuyers,
      totalAgents: totalAgents,
      totalProperties: totalApprovedProperties,
      pendingProperties: pendingApprovalCount,
      totalInquiries: totalInquiries,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// GET /api/admin/properties
// Get all properties (with optional filter)
// ============================================================
router.get('/properties', async (req, res) => {
  try {
    const filter = req.query.filter; // 'approved', 'pending', 'featured', or nothing

    // Build the query based on filter
    const query = {};
    if (filter === 'approved') {
      query.isApproved = true;
    } else if (filter === 'pending') {
      query.isApproved = false;
    } else if (filter === 'featured') {
      query.isApproved = true;
      query.isFeatured = true;
    }

    const properties = await Property.find(query)
      .populate('agent', 'name email')
      .sort({ createdAt: -1 });

    res.json(properties);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// GET /api/admin/properties/pending
// Get only pending (unapproved) properties
// ============================================================
router.get('/properties/pending', async (req, res) => {
  try {
    const pendingProperties = await Property.find({ isApproved: false })
      .populate('agent', 'name email')
      .sort({ createdAt: -1 });

    res.json(pendingProperties);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// PUT /api/admin/properties/:id/approve
// Approve a property so it shows on the site
// ============================================================
router.put('/properties/:id/approve', async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );

    res.json(property);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// PUT /api/admin/properties/:id/disapprove
// Remove a property from the site (but don't delete it)
// ============================================================
router.put('/properties/:id/disapprove', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    property.isApproved = false;
    property.isFeatured = false; // Can't be featured if not approved
    await property.save();

    res.json(property);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// PUT /api/admin/properties/:id/feature
// Toggle the featured status of a property
// ============================================================
router.put('/properties/:id/feature', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Flip the current value: true becomes false, false becomes true
    property.isFeatured = !property.isFeatured;
    await property.save();

    res.json(property);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// DELETE /api/admin/properties/:id
// Permanently delete a property
// ============================================================
router.delete('/properties/:id', async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    res.json({ message: 'Property deleted.' });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// GET /api/admin/users
// Get all users
// ============================================================
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')  // Never send passwords
      .sort({ createdAt: -1 });

    res.json(users);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// PUT /api/admin/users/:id/toggle
// Activate or deactivate a user account
// ============================================================
router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Flip the active status
    user.isActive = !user.isActive;
    await user.save();

    const statusText = user.isActive ? 'activated' : 'deactivated';

    res.json({
      message: `User has been ${statusText}.`,
      isActive: user.isActive,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// PUT /api/admin/users/:id/role
// Change a user's role (buyer → agent, etc.)
// ============================================================
router.put('/users/:id/role', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true }
    ).select('-password');

    res.json(updatedUser);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
