// ============================================================
// properties.js — Property routes with Redis response caching
// ============================================================

const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { body, validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../config/redis');

function checkValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  return null;
}

const propertyValidation = [
  body('title').trim().notEmpty().withMessage('Title is required.'),
  body('description').trim().notEmpty().withMessage('Description is required.'),
  body('price').isNumeric().withMessage('Price must be a number.').custom(v => v > 0).withMessage('Price must be positive.'),
  body('type').isIn(['house', 'apartment', 'villa', 'commercial', 'plot']).withMessage('Invalid property type.'),
  body('status').isIn(['sale', 'rent']).withMessage('Status must be sale or rent.'),
  body('area').isNumeric().withMessage('Area must be a number.').custom(v => v > 0).withMessage('Area must be positive.'),
  body('address').trim().notEmpty().withMessage('Address is required.'),
  body('city').trim().notEmpty().withMessage('City is required.'),
];

// ============================================================
// GET /api/properties — Cached listing with filters
// ============================================================
router.get('/', async (req, res) => {
  try {
    // Build a cache key from the full query string
    // Same query = same cache key = serve from Redis, skip DB
    const cacheKey = `properties:list:${JSON.stringify(req.query)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const { city, type, status, minPrice, maxPrice, bedrooms, search, featured, sort = 'newest' } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;

    const filter = { isApproved: true };
    if (city) filter['location.city'] = { $regex: city, $options: 'i' };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (bedrooms) filter.bedrooms = { $gte: parseInt(bedrooms) };
    if (featured) filter.isFeatured = true;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseInt(minPrice);
      if (maxPrice) filter.price.$lte = parseInt(maxPrice);
    }
    if (search) filter.$text = { $search: search };

    let sortObj = { isFeatured: -1, createdAt: -1 };
    if (sort === 'price_asc') sortObj = { price: 1 };
    else if (sort === 'price_desc') sortObj = { price: -1 };
    else if (sort === 'oldest') sortObj = { createdAt: 1 };
    else if (sort === 'popular') sortObj = { views: -1 };

    const [totalCount, properties] = await Promise.all([
      Property.countDocuments(filter),
      Property.find(filter)
        .populate('agent', 'name email phone avatar')
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const result = { properties, total: totalCount, pages: Math.ceil(totalCount / limit), currentPage: page };

    // Cache for 60 seconds — property lists are frequently read, rarely change
    await cacheSet(cacheKey, result, 60);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// GET /api/properties/stats/public — Cached platform stats
// ============================================================
router.get('/stats/public', async (req, res) => {
  try {
    const cacheKey = 'properties:stats:public';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const [totalProperties, cities] = await Promise.all([
      Property.countDocuments({ isApproved: true }),
      Property.distinct('location.city', { isApproved: true }),
    ]);

    const result = { totalProperties, totalCities: cities.length };
    // Cache for 10 minutes — stats don't need to be real-time
    await cacheSet(cacheKey, result, 600);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// GET /api/properties/agent/my
// ============================================================
router.get('/agent/my', protect, authorize('agent', 'admin'), async (req, res) => {
  try {
    const myProperties = await Property.find({ agent: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(myProperties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// GET /api/properties/:id — Cached single property
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const cacheKey = `properties:detail:${req.params.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      // Still increment views asynchronously (don't await — fire and forget)
      Property.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();
      return res.json(cached);
    }

    const property = await Property.findById(req.params.id)
      .populate('agent', 'name email phone avatar bio')
      .lean();

    if (!property) return res.status(404).json({ message: 'Property not found.' });

    Property.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();

    // Cache property detail for 5 minutes
    await cacheSet(cacheKey, property, 300);

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// POST /api/properties — Create listing
// ============================================================
router.post('/', protect, authorize('agent', 'admin'), upload.array('images', 10), propertyValidation, async (req, res) => {
  const validationError = checkValidation(req, res);
  if (validationError) return validationError;

  try {
    const imageUrls = req.files ? req.files.map(file => file.path) : [];
    const features = req.body.features ? JSON.parse(req.body.features) : [];
    const coordinates = {};
    if (req.body.lat) coordinates.lat = parseFloat(req.body.lat);
    if (req.body.lng) coordinates.lng = parseFloat(req.body.lng);

    const newProperty = await Property.create({
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      type: req.body.type,
      status: req.body.status,
      bedrooms: req.body.bedrooms || 0,
      bathrooms: req.body.bathrooms || 0,
      area: req.body.area,
      features,
      images: imageUrls,
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

    // Bust property list cache so new listing appears
    await cacheDelPattern('properties:list:*');
    await cacheDel('properties:stats:public');

    res.status(201).json(newProperty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// PUT /api/properties/:id
// ============================================================
router.put('/:id', protect, authorize('agent', 'admin'), upload.array('images', 10), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found.' });

    const isOwner = property.agent.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'You can only edit your own properties.' });

    const newImageUrls = req.files ? req.files.map(file => file.path) : [];
    const existingImages = req.body.existingImages ? JSON.parse(req.body.existingImages) : property.images;
    const allImages = [...existingImages, ...newImageUrls];

    // Cleanup removed Cloudinary images
    const removedImages = property.images.filter(img => !existingImages.includes(img));
    if (removedImages.length > 0) {
      await Promise.all(removedImages.map(url => {
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        const publicId = `realestate/${filename.split('.')[0]}`;
        return cloudinary.uploader.destroy(publicId).catch(() => {});
      }));
    }

    const features = req.body.features ? JSON.parse(req.body.features) : property.features;

    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title || property.title,
        description: req.body.description || property.description,
        price: req.body.price || property.price,
        type: req.body.type || property.type,
        status: req.body.status || property.status,
        bedrooms: req.body.bedrooms !== undefined ? req.body.bedrooms : property.bedrooms,
        bathrooms: req.body.bathrooms !== undefined ? req.body.bathrooms : property.bathrooms,
        area: req.body.area || property.area,
        features,
        images: allImages,
        location: {
          address: req.body.address || property.location.address,
          city: req.body.city || property.location.city,
          state: req.body.state || property.location.state,
          country: req.body.country || property.location.country,
        },
        isApproved: isAdmin ? property.isApproved : false,
      },
      { new: true }
    ).lean();

    // Bust both list cache and this property's detail cache
    await Promise.all([
      cacheDelPattern('properties:list:*'),
      cacheDel(`properties:detail:${req.params.id}`),
    ]);

    res.json(updatedProperty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// DELETE /api/properties/:id
// ============================================================
router.delete('/:id', protect, authorize('agent', 'admin'), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found.' });

    const isOwner = property.agent.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'You can only delete your own properties.' });

    // Cleanup Cloudinary images
    if (property.images?.length > 0) {
      await Promise.all(property.images.map(url => {
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        const publicId = `realestate/${filename.split('.')[0]}`;
        return cloudinary.uploader.destroy(publicId).catch(() => {});
      }));
    }

    await property.deleteOne();

    await Promise.all([
      cacheDelPattern('properties:list:*'),
      cacheDel(`properties:detail:${req.params.id}`),
      cacheDel('properties:stats:public'),
    ]);

    res.json({ message: 'Property deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
