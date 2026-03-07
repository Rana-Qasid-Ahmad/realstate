const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Property = require('../models/Property');

// @GET /api/agents - All agents
router.get('/', async (req, res) => {
  try {
    const agents = await User.find({ role: 'agent', isActive: true }).select('-password');
    const agentsWithCount = await Promise.all(agents.map(async (agent) => {
      const count = await Property.countDocuments({ agent: agent._id, isApproved: true });
      return { ...agent.toObject(), propertyCount: count };
    }));
    res.json(agentsWithCount);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/agents/:id
router.get('/:id', async (req, res) => {
  try {
    const agent = await User.findOne({ _id: req.params.id, role: 'agent' }).select('-password');
    if (!agent) return res.status(404).json({ message: 'Agent not found' });
    const properties = await Property.find({ agent: agent._id, isApproved: true }).sort({ createdAt: -1 });
    res.json({ agent, properties });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
