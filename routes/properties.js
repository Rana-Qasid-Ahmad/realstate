<<<<<<< HEAD
=======
// ============================================================
// properties.js — Routes for property listings
// ============================================================

>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

<<<<<<< HEAD
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
=======

// ============================================================
// GET /api/properties
// Get all approved properties with optional filters
// ============================================================
router.get('/', async (req, res) => {
  try {
    // Read the filter values from the URL query string
    // Example URL: /api/properties?city=Lahore&type=house&page=2
    const city = req.query.city;
    const type = req.query.type;
    const status = req.query.status;
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;
    const bedrooms = req.query.bedrooms;
    const searchText = req.query.search;
    const featured = req.query.featured;
    const page = parseInt(req.query.page) || 1;   // Default to page 1
    const limit = parseInt(req.query.limit) || 9; // Show 9 per page

    // Start with a base filter: only show approved properties
    const filter = { isApproved: true };

    // Add more filters only if they were provided in the URL
    if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' }; // case-insensitive search
    }
    if (type) {
      filter.type = type;
    }
    if (status) {
      filter.status = status;
    }
    if (bedrooms) {
      filter.bedrooms = { $gte: parseInt(bedrooms) }; // $gte = greater than or equal
    }
    if (featured) {
      filter.isFeatured = true;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseInt(minPrice);
      if (maxPrice) filter.price.$lte = parseInt(maxPrice); // $lte = less than or equal
    }

    // Full text search (searches title, city, address)
    if (searchText) {
      filter.$text = { $search: searchText };
    }

    // Count total matching documents (needed for pagination)
    const totalCount = await Property.countDocuments(filter);

    // Fetch the properties for this page
    const properties = await Property.find(filter)
      .populate('agent', 'name email phone avatar') // replace agent ID with actual agent data
      .sort({ isFeatured: -1, createdAt: -1 })      // featured first, then newest first
      .skip((page - 1) * limit)                      // skip pages before this one
      .limit(limit);                                 // only return this many

    // Calculate total pages for the frontend to show pagination
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      properties: properties,
      total: totalCount,
      pages: totalPages,
      currentPage: page,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// GET /api/properties/agent/my
// Get all properties created by the logged in agent
// NOTE: this must be BEFORE /:id to avoid confusion
// ============================================================
router.get('/agent/my', protect, authorize('agent', 'admin'), async (req, res) => {
  try {
    const myProperties = await Property.find({ agent: req.user._id })
      .sort({ createdAt: -1 });

    res.json(myProperties);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// GET /api/properties/:id
// Get a single property by its ID
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('agent', 'name email phone avatar bio');

    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Increment the view count each time someone opens a property
    property.views = property.views + 1;
    await property.save();

    res.json(property);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// POST /api/properties
// Create a new property listing (agents and admins only)
// upload.array('images', 10) handles up to 10 image uploads
// ============================================================
router.post('/', protect, authorize('agent', 'admin'), upload.array('images', 10), async (req, res) => {
  try {
    // Get the uploaded image URLs from Cloudinary
    // req.files is set by the multer upload middleware
    const imageUrls = req.files ? req.files.map(file => file.path) : [];

    // Features come as a JSON string from the form, parse it back to array
    const features = req.body.features ? JSON.parse(req.body.features) : [];

    // Coordinates are optional
    const coordinates = {};
    if (req.body.lat) coordinates.lat = parseFloat(req.body.lat);
    if (req.body.lng) coordinates.lng = parseFloat(req.body.lng);

    // Create the property
    // If an admin creates it, it's auto-approved. Agents must wait for approval.
    const isAutoApproved = req.user.role === 'admin';

    const newProperty = await Property.create({
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      type: req.body.type,
      status: req.body.status,
      bedrooms: req.body.bedrooms,
      bathrooms: req.body.bathrooms,
      area: req.body.area,
      features: features,
      images: imageUrls,
>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
      agent: req.user._id,
      location: {
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        country: req.body.country || 'Pakistan',
<<<<<<< HEAD
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
=======
        coordinates: coordinates,
      },
      isApproved: isAutoApproved,
    });

    res.status(201).json(newProperty);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// PUT /api/properties/:id
// Update a property (only the agent who owns it, or an admin)
// ============================================================
router.put('/:id', protect, authorize('agent', 'admin'), upload.array('images', 10), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Check ownership: the logged in user must be the agent who created it (or an admin)
    const isOwner = property.agent.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You can only edit your own properties.' });
    }

    // Handle images: keep existing ones and add new ones
    const newImageUrls = req.files ? req.files.map(file => file.path) : [];
    const existingImages = req.body.existingImages ? JSON.parse(req.body.existingImages) : property.images;
    const allImages = [...existingImages, ...newImageUrls];

    // Handle features
    const features = req.body.features ? JSON.parse(req.body.features) : property.features;

    // When an agent edits, reset approval so admin must re-approve
    // Admins editing don't lose their approval
    const approvalStatus = isAdmin ? property.isApproved : false;

    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        type: req.body.type,
        status: req.body.status,
        bedrooms: req.body.bedrooms,
        bathrooms: req.body.bathrooms,
        area: req.body.area,
        features: features,
        images: allImages,
        location: {
          address: req.body.address || property.location.address,
          city: req.body.city || property.location.city,
          state: req.body.state || property.location.state,
          country: req.body.country || property.location.country,
        },
        isApproved: approvalStatus,
      },
      { new: true } // return the updated document
    );

    res.json(updatedProperty);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// DELETE /api/properties/:id
// Delete a property
// ============================================================
router.delete('/:id', protect, authorize('agent', 'admin'), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Only the owner or an admin can delete
    const isOwner = property.agent.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You can only delete your own properties.' });
    }

    await property.deleteOne();

    res.json({ message: 'Property deleted successfully.' });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4

module.exports = router;
