// ============================================================
// agents.js — Routes for agent profiles
// ============================================================

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Property = require('../models/Property');


// ============================================================
// GET /api/agents
// Get all agents with their property count
// ============================================================
router.get('/', async (req, res) => {
  try {
    // Find all users who are agents and are not deactivated
    const agents = await User.find({ role: 'agent', isActive: true })
      .select('-password');

    // For each agent, count how many approved properties they have
    // Promise.all runs all the counts at the same time (faster than one by one)
    const agentsWithPropertyCount = await Promise.all(
      agents.map(async (agent) => {
        const count = await Property.countDocuments({
          agent: agent._id,
          isApproved: true,
        });

        // Convert the mongoose document to a plain object and add propertyCount
        return {
          ...agent.toObject(),
          propertyCount: count,
        };
      })
    );

    res.json(agentsWithPropertyCount);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// GET /api/agents/:id
// Get a single agent's profile and their listings
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    // Find the user but only if they are an agent
    const agent = await User.findOne({
      _id: req.params.id,
      role: 'agent',
    }).select('-password');

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found.' });
    }

    // Get all approved properties listed by this agent
    const properties = await Property.find({
      agent: agent._id,
      isApproved: true,
    }).sort({ createdAt: -1 });

    res.json({ agent: agent, properties: properties });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
