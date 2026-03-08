// ============================================================
// agents.js — Agent profile routes
// Fixed: N+1 query problem (was doing 1 DB query per agent)
// Now: single aggregation query for all agents + their counts
// ============================================================

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Property = require('../models/Property');
const { cacheGet, cacheSet } = require('../config/redis');

// ============================================================
// GET /api/agents — Cached agent list with property counts
// ============================================================
router.get('/', async (req, res) => {
  try {
    const cacheKey = 'agents:list';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    // Use aggregation to get agents + property counts in ONE query
    // instead of N+1 (one count query per agent)
    const agents = await User.find({ role: 'agent', isActive: true })
      .select('-password')
      .lean();

    const agentIds = agents.map(a => a._id);

    // Single aggregation query to count approved properties per agent
    const propertyCounts = await Property.aggregate([
      { $match: { agent: { $in: agentIds }, isApproved: true } },
      { $group: { _id: '$agent', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    propertyCounts.forEach(p => { countMap[p._id.toString()] = p.count; });

    const result = agents.map(agent => ({
      ...agent,
      propertyCount: countMap[agent._id.toString()] || 0,
    }));

    await cacheSet(cacheKey, result, 120); // cache 2 min
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// GET /api/agents/:id
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const cacheKey = `agents:detail:${req.params.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const [agent, properties] = await Promise.all([
      User.findOne({ _id: req.params.id, role: 'agent' }).select('-password').lean(),
      Property.find({ agent: req.params.id, isApproved: true }).sort({ createdAt: -1 }).lean(),
    ]);

    if (!agent) return res.status(404).json({ message: 'Agent not found.' });

    const result = { agent, properties };
    await cacheSet(cacheKey, result, 120);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
