// ============================================================
// inquiries.js — Routes for property contact forms
// ============================================================

const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const Property = require('../models/Property');
const { protect, authorize } = require('../middleware/auth');


// ============================================================
// POST /api/inquiries
// Submit a contact form about a property
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { propertyId, name, email, phone, message, senderId } = req.body;

    // Make sure the property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Create the inquiry and automatically set the agent field
    const newInquiry = await Inquiry.create({
      property: propertyId,
      agent: property.agent,  // The agent who listed the property
      name: name,
      email: email,
      phone: phone,
      message: message,
      sender: senderId || null,
    });

    res.status(201).json({ message: 'Inquiry sent successfully.', inquiry: newInquiry });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// GET /api/inquiries/agent
// Get all inquiries for the logged in agent
// ============================================================
router.get('/agent', protect, authorize('agent', 'admin'), async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ agent: req.user._id })
      .populate('property', 'title location images')
      .sort({ createdAt: -1 });

    res.json(inquiries);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// PUT /api/inquiries/:id/status
// Update the status of an inquiry (new → read → replied)
// ============================================================
router.put('/:id/status', protect, authorize('agent', 'admin'), async (req, res) => {
  try {
    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    res.json(updatedInquiry);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
