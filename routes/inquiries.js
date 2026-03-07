<<<<<<< HEAD
=======
// ============================================================
// inquiries.js — Routes for property contact forms
// ============================================================

>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const Property = require('../models/Property');
const { protect, authorize } = require('../middleware/auth');

<<<<<<< HEAD
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
=======

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
>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
router.get('/agent', protect, authorize('agent', 'admin'), async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ agent: req.user._id })
      .populate('property', 'title location images')
      .sort({ createdAt: -1 });
<<<<<<< HEAD
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/inquiries/:id/status
router.put('/:id/status', protect, authorize('agent', 'admin'), async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(
=======

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
>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
<<<<<<< HEAD
    res.json(inquiry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

=======

    res.json(updatedInquiry);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
module.exports = router;
