<<<<<<< HEAD
=======
// ============================================================
// admin.js — Routes only accessible by admins
// ============================================================

>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Property = require('../models/Property');
const Inquiry = require('../models/Inquiry');
const { protect, authorize } = require('../middleware/auth');

<<<<<<< HEAD
// All admin routes require admin role
router.use(protect, authorize('admin'));

// @GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalAgents, totalProperties, pendingProperties, totalInquiries] = await Promise.all([
      User.countDocuments({ role: 'buyer' }),
      User.countDocuments({ role: 'agent' }),
      Property.countDocuments({ isApproved: true }),
      Property.countDocuments({ isApproved: false }),
      Inquiry.countDocuments(),
    ]);
    res.json({ totalUsers, totalAgents, totalProperties, pendingProperties, totalInquiries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/admin/properties/pending
router.get('/properties/pending', async (req, res) => {
  try {
    const properties = await Property.find({ isApproved: false })
      .populate('agent', 'name email')
      .sort({ createdAt: -1 });
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/admin/properties/:id/approve
=======
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
>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
router.put('/properties/:id/approve', async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
<<<<<<< HEAD
    res.json(property);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/admin/properties/:id/feature
router.put('/properties/:id/feature', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    property.isFeatured = !property.isFeatured;
    await property.save();
    res.json(property);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/admin/users/:id/toggle
router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
=======

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
>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
      req.params.id,
      { role: req.body.role },
      { new: true }
    ).select('-password');
<<<<<<< HEAD
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

=======

    res.json(updatedUser);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
module.exports = router;
