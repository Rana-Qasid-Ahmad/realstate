const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Property = require('../models/Property');
const Inquiry = require('../models/Inquiry');
const { protect, authorize } = require('../middleware/auth');

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
router.put('/properties/:id/approve', async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
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
      req.params.id,
      { role: req.body.role },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
