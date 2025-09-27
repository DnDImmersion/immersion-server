const express = require('express');
const router = express.Router();
const Image = require('../models/Image');
const cloudinary = require('../config/cloudinary');
const unsplash = require('../config/unsplash');
const CampaignImage = require('../models/CampaignImage');
const fetch = require('node-fetch');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

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

// POST upload image file to Cloudinary
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const { name, category, tags } = req.body;
    
    // Validate required fields
    if (!name || !category) {
      return res.status(400).json({ message: 'Name and category are required' });
    }

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'dnd-images', // Organize uploads in a folder
          public_id: `${category}_${Date.now()}`, // Generate unique ID
          transformation: [
            { width: 1920, height: 1080, crop: 'limit', quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    // Create image record in database
    const image = new Image({
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryId: uploadResult.public_id,
      category: category,
      name: name,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    });
    
    const savedImage = await image.save();
    
    res.status(201).json({
      message: 'Image uploaded successfully',
      image: savedImage,
      cloudinaryData: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        format: uploadResult.format,
        size: uploadResult.bytes
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST upload image from URL (for Pixabay/Unsplash images)
router.post('/upload-from-url', async (req, res) => {
  try {
    const { imageUrl, name, category, tags } = req.body;
    
    // Validate required fields
    if (!imageUrl || !name || !category) {
      return res.status(400).json({ message: 'Image URL, name, and category are required' });
    }

    // Upload to Cloudinary from URL
    const uploadResult = await cloudinary.uploader.upload(imageUrl, {
      folder: 'dnd-images',
      public_id: `${category}_${Date.now()}`,
      transformation: [
        { width: 1920, height: 1080, crop: 'limit', quality: 'auto' }
      ]
    });

    // Create image record in database
    const image = new Image({
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryId: uploadResult.public_id,
      category: category,
      name: name,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : []
    });
    
    const savedImage = await image.save();
    
    res.status(201).json({
      message: 'Image uploaded from URL successfully',
      image: savedImage,
      cloudinaryData: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        format: uploadResult.format,
        size: uploadResult.bytes
      }
    });
  } catch (error) {
    console.error('Upload from URL error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST upload multiple images from URLs (bulk)
router.post('/upload-bulk-from-urls', async (req, res) => {
  try {
    const { images } = req.body; // Array of { imageUrl, name, category, tags }
    
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: 'Images array is required' });
    }

    const results = [];
    const errors = [];

    // Process each image
    for (let i = 0; i < images.length; i++) {
      const { imageUrl, name, category, tags } = images[i];
      
      try {
        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(imageUrl, {
          folder: 'dnd-images',
          public_id: `${category}_${Date.now()}_${i}`,
          transformation: [
            { width: 1920, height: 1080, crop: 'limit', quality: 'auto' }
          ]
        });

        // Create image record
        const image = new Image({
          cloudinaryUrl: uploadResult.secure_url,
          cloudinaryId: uploadResult.public_id,
          category: category,
          name: name,
          tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : []
        });
        
        const savedImage = await image.save();
        results.push(savedImage);
        
      } catch (error) {
        console.error(`Error uploading image ${i}:`, error);
        errors.push({ index: i, error: error.message, imageData: images[i] });
      }
    }
    
    res.status(201).json({
      message: `Successfully uploaded ${results.length} images`,
      successful: results.length,
      failed: errors.length,
      images: results,
      errors: errors
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ message: error.message });
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

// GET search Pixabay
router.get('/search-pixabay', async (req, res) => {
  try {
    const { query, image_type = 'illustration', per_page = 20, page = 1 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const apiKey = process.env.PIXABAY_API_KEY;
    const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=${image_type}&per_page=${per_page}&page=${page}&safesearch=true&order=popular`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      return res.status(400).json({ error: data.error });
    }
    
    // Transform Pixabay data
    const images = data.hits.map(hit => ({
      id: hit.id,
      previewURL: hit.previewURL,
      largeImageURL: hit.largeImageURL,
      tags: hit.tags,
      views: hit.views,
      downloads: hit.downloads,
      user: hit.user
    }));
    
    res.json({
      images,
      total: data.totalHits,
      page: parseInt(page),
      totalPages: Math.ceil(data.totalHits / per_page)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET search Unsplash
router.get('/search-unsplash', async (req, res) => {
  try {
    const { query, per_page = 20, page = 1 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const result = await unsplash.search.getPhotos({
      query: query,
      perPage: per_page,
      page: page,
      orientation: 'landscape'
    });
    
    if (result.errors) {
      return res.status(400).json({ errors: result.errors });
    }
    
    // Transform Unsplash data
    const photos = result.response.results.map(photo => ({
      id: photo.id,
      url: photo.urls.regular,
      thumbnail: photo.urls.thumb,
      description: photo.description || photo.alt_description || 'Untitled',
      photographer: photo.user.name,
      downloadUrl: photo.links.download
    }));
    
    res.json({
      results: photos,
      total: result.response.total,
      page: parseInt(page),
      totalPages: result.response.total_pages
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;