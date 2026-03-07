// ============================================================
// upload.js — Handles image uploads to Cloudinary
// Cloudinary = a cloud service that stores images for us
// Multer = a library that handles file uploads in Express
// ============================================================

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Step 1: Connect to Cloudinary using our credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Step 2: Tell Cloudinary where and how to store files
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'realestate',                          // Save all images in a folder called "realestate"
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], // Only allow these image types
    transformation: [
      { width: 1200, height: 800, crop: 'fill' }  // Resize all images to 1200x800
    ],
  },
});

// Step 3: Create the upload handler with a 5MB file size limit
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB in bytes
  },
});

module.exports = { cloudinary, upload };
