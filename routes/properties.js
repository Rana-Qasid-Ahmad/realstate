const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// @GET /api/properties - Get all approved properties with filters
router.get('/', async (req, res) => {
  try {
    const { city, type, status, minPrice, maxPrice, bedrooms, search, page = 1, limit = 9, featured } = req.query;
    const query = { isApproved: true };

    if (city) query['location.city'] = { $regex: city, $options: 'i' };
    if (type) query.type = type;
    if (status) query.status = status;
    if (bedrooms) query.bedrooms = { $gte: parseInt(bedrooms) };
    if (featured) query.isFeatured = true;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }
    if (search) {
      query.$text = { $search: search };
    }

    const total = await Property.countDocuments(query);
    const properties = await Property.find(query)
      .populate('agent', 'name email phone avatar')
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ properties, total, pages: Math.ceil(total / limit), currentPage: parseInt(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/properties/:id
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('agent', 'name email phone avatar bio');
    if (!property) return res.status(404).json({ message: 'Property not found' });
    property.views += 1;
    await property.save();
    res.json(property);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @POST /api/properties - Agent creates property
router.post('/', protect, authorize('agent', 'admin'), upload.array('images', 10), async (req, res) => {
  try {
    const images = req.files ? req.files.map(f => f.path) : [];
    const features = req.body.features ? JSON.parse(req.body.features) : [];
    const coordinates = req.body.lat ? { lat: parseFloat(req.body.lat), lng: parseFloat(req.body.lng) } : {};

    const property = await Property.create({
      ...req.body,
      features,
      images,
      agent: req.user._id,
      location: {
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        country: req.body.country || 'Pakistan',
        coordinates,
      },
      isApproved: req.user.role === 'admin',
    });

    res.status(201).json(property);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/properties/:id
router.put('/:id', protect, authorize('agent', 'admin'), upload.array('images', 10), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (property.agent.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const newImages = req.files ? req.files.map(f => f.path) : [];
    const existingImages = req.body.existingImages ? JSON.parse(req.body.existingImages) : property.images;
    const features = req.body.features ? JSON.parse(req.body.features) : property.features;

    const updated = await Property.findByIdAndUpdate(req.params.id, {
      ...req.body,
      features,
      images: [...existingImages, ...newImages],
      location: {
        address: req.body.address || property.location.address,
        city: req.body.city || property.location.city,
        state: req.body.state || property.location.state,
        country: req.body.country || property.location.country,
      },
    }, { new: true });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @DELETE /api/properties/:id
router.delete('/:id', protect, authorize('agent', 'admin'), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (property.agent.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await property.deleteOne();
    res.json({ message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/properties/agent/my - Agent's own properties
router.get('/agent/my', protect, authorize('agent', 'admin'), async (req, res) => {
  try {
    const properties = await Property.find({ agent: req.user._id }).sort({ createdAt: -1 });
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
