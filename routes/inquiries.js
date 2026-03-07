const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const Property = require('../models/Property');
const { protect, authorize } = require('../middleware/auth');

// @POST /api/inquiries - Submit inquiry
router.post('/', async (req, res) => {
  try {
    const { propertyId, name, email, phone, message } = req.body;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const inquiry = await Inquiry.create({
      property: propertyId,
      agent: property.agent,
      name, email, phone, message,
      sender: req.body.senderId || null,
    });

    res.status(201).json({ message: 'Inquiry sent successfully', inquiry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/inquiries/agent - Agent's received inquiries
router.get('/agent', protect, authorize('agent', 'admin'), async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ agent: req.user._id })
      .populate('property', 'title location images')
      .sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/inquiries/:id/status
router.put('/:id/status', protect, authorize('agent', 'admin'), async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(inquiry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
