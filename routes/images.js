const express = require('express');
const router = express.Router();
const Image = require('../models/Image');
const cloudinary = require('../config/cloudinary');
const unsplash = require('../config/unsplash');
const CampaignImage = require('../models/CampaignImage')

// GET all images
router.get('/', async (req, res) => {
  try {
    const { category, tags } = req.query;
    let filter = {};
    
    if (category) filter.category = category;
    if (tags) filter.tags = { $in: tags.split(',') };
    
    const images = await Image.find(filter).sort({ createdAt: -1 });
    res.json(images);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new image
router.post('/', async (req, res) => {
  try {
    const image = new Image({
      cloudinaryUrl: req.body.cloudinaryUrl,
      cloudinaryId: req.body.cloudinaryId,
      category: req.body.category,
      name: req.body.name,
      tags: req.body.tags || []
    });
    
    const savedImage = await image.save();
    res.status(201).json(savedImage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add this route to your existing routes/images.js file

// POST bulk create images
router.post('/bulk', async (req, res) => {
  try {
    // Expecting req.body to be an array of image objects
    const images = req.body;
    
    // Validate that it's an array
    if (!Array.isArray(images)) {
      return res.status(400).json({ message: 'Request body must be an array of images' });
    }
    
    // Insert all images at once
    const savedImages = await Image.insertMany(images);
    res.status(201).json(savedImages);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


// POST import images from Cloudinary folder
router.post('/import-from-cloudinary', async (req, res) => {
  try {
    const { folder, category } = req.body;
    
    // Get images from Cloudinary folder
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      max_results: 500
    });
    
    // Transform Cloudinary data to our schema
    const imagesToCreate = result.resources.map(img => {
      const pathParts = img.public_id.split('/');
      const filename = pathParts[pathParts.length - 1].replace(/\.[^/.]+$/, "");
      
      return {
        cloudinaryUrl: img.secure_url,
        cloudinaryId: img.public_id,
        category: category,
        name: filename.replace(/-/g, ' '),
        tags: pathParts.slice(1, -1)
      };
    });
    
    // Check for existing images by cloudinaryId to avoid duplicates
    const existingIds = await Image.find({ 
      cloudinaryId: { $in: imagesToCreate.map(img => img.cloudinaryId) } 
    }).select('cloudinaryId');
    
    const existingIdSet = new Set(existingIds.map(img => img.cloudinaryId));
    
    // Filter out images that already exist
    const newImages = imagesToCreate.filter(img => !existingIdSet.has(img.cloudinaryId));
    
    if (newImages.length === 0) {
      return res.json({ 
        message: 'No new images to import - all images already exist',
        imported: 0,
        skipped: imagesToCreate.length
      });
    }
    
    // Bulk insert only new images
    const savedImages = await Image.insertMany(newImages);
    
    res.status(201).json({
      message: `Imported ${savedImages.length} new images from Cloudinary`,
      imported: savedImages.length,
      skipped: imagesToCreate.length - savedImages.length,
      images: savedImages
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


router.get('/search-unsplash', async (req, res) => {
  try {
    const { query, per_page = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const result = await unsplash.search.getPhotos({
      query: query,
      perPage: per_page,
      orientation: 'landscape' // Good for D&D scenes
    });
    
    if (result.errors) {
      return res.status(400).json({ errors: result.errors });
    }
    
    // Transform Unsplash data for easy frontend use
    const photos = result.response.results.map(photo => ({
      id: photo.id,
      url: photo.urls.regular,
      thumbnail: photo.urls.thumb,
      description: photo.description || photo.alt_description || 'Untitled',
      photographer: photo.user.name,
      downloadUrl: photo.links.download
    }));
    
    res.json(photos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE image by ID
router.delete('/:id', async (req, res) => {
  try {
    const image = await Image.findByIdAndDelete(req.params.id);
    
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    // Also remove from any campaigns
    await CampaignImage.deleteMany({ imageId: req.params.id });
    
    res.json({ message: 'Image deleted successfully', deletedImage: image });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;