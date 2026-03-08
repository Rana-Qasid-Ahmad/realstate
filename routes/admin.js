// ============================================================
// admin.js — Admin routes with cache invalidation + email queue
// ============================================================

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Property = require('../models/Property');
const Inquiry = require('../models/Inquiry');
const { protect, authorize, invalidateUserCache } = require('../middleware/auth');
const { queueApprovalEmail, queueRejectionEmail } = require('../config/emailQueue');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../config/redis');

router.use(protect, authorize('admin'));

// ============================================================
// GET /api/admin/stats — Cached dashboard stats
// ============================================================
router.get('/stats', async (req, res) => {
  try {
    const cacheKey = 'admin:stats';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const [totalBuyers, totalAgents, totalApprovedProperties, pendingApprovalCount, totalInquiries] = await Promise.all([
      User.countDocuments({ role: 'buyer' }),
      User.countDocuments({ role: 'agent' }),
      Property.countDocuments({ isApproved: true }),
      Property.countDocuments({ isApproved: false }),
      Inquiry.countDocuments(),
    ]);

    const result = { totalUsers: totalBuyers, totalAgents, totalProperties: totalApprovedProperties, pendingProperties: pendingApprovalCount, totalInquiries };
    await cacheSet(cacheKey, result, 120); // cache 2 min
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// GET /api/admin/properties — Paginated
// ============================================================
router.get('/properties', async (req, res) => {
  try {
    const { filter, page: p = 1, limit: l = 20 } = req.query;
    const page = parseInt(p), limit = parseInt(l);

    const query = {};
    if (filter === 'approved') query.isApproved = true;
    else if (filter === 'pending') query.isApproved = false;
    else if (filter === 'featured') { query.isApproved = true; query.isFeatured = true; }

    const [total, properties] = await Promise.all([
      Property.countDocuments(query),
      Property.find(query).populate('agent', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);

    res.json({ properties, total, pages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// PUT /api/admin/properties/:id/approve
// ============================================================
router.put('/properties/:id/approve', async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true }).populate('agent', 'name email');
    if (!property) return res.status(404).json({ message: 'Property not found.' });

    if (property.agent?.email) {
      await queueApprovalEmail(property.agent.email, property.agent.name, property.title).catch(() => {});
    }

    // Bust list cache so approved property appears immediately
    await Promise.all([
      cacheDelPattern('properties:list:*'),
      cacheDel(`properties:detail:${req.params.id}`),
      cacheDel('admin:stats'),
    ]);

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// PUT /api/admin/properties/:id/disapprove
// ============================================================
router.put('/properties/:id/disapprove', async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { isApproved: false, isFeatured: false },
      { new: true }
    ).populate('agent', 'name email');
    if (!property) return res.status(404).json({ message: 'Property not found.' });

    if (property.agent?.email) {
      await queueRejectionEmail(property.agent.email, property.agent.name, property.title).catch(() => {});
    }

    await Promise.all([
      cacheDelPattern('properties:list:*'),
      cacheDel(`properties:detail:${req.params.id}`),
      cacheDel('admin:stats'),
    ]);

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// PUT /api/admin/properties/:id/feature
// ============================================================
router.put('/properties/:id/feature', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found.' });
    property.isFeatured = !property.isFeatured;
    await property.save();

    await Promise.all([
      cacheDelPattern('properties:list:*'),
      cacheDel(`properties:detail:${req.params.id}`),
    ]);

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// DELETE /api/admin/properties/:id
// ============================================================
router.delete('/properties/:id', async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found.' });

    await Promise.all([
      cacheDelPattern('properties:list:*'),
      cacheDel(`properties:detail:${req.params.id}`),
      cacheDel('admin:stats'),
    ]);

    res.json({ message: 'Property deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// GET /api/admin/users — Paginated + search
// ============================================================
router.get('/users', async (req, res) => {
  try {
    const { page: p = 1, limit: l = 20, role, search } = req.query;
    const page = parseInt(p), limit = parseInt(l);

    const query = {};
    if (role && role !== 'all') query.role = role;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query).select('-password').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);

    res.json({ users, total, pages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// PUT /api/admin/users/:id/toggle
// ============================================================
router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.isActive = !user.isActive;
    await user.save();
    await invalidateUserCache(req.params.id); // force re-fetch from DB on next request
    res.json({ message: `User has been ${user.isActive ? 'activated' : 'deactivated'}.`, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// PUT /api/admin/users/:id/role
// ============================================================
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['buyer', 'agent', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role.' });

    const updatedUser = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password').lean();
    if (!updatedUser) return res.status(404).json({ message: 'User not found.' });

    await invalidateUserCache(req.params.id); // role changed — bust cache
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
