const express = require('express');
const router = express.Router();
const CampaignImage = require('../models/CampaignImage');
const Image = require('../models/Image');

// GET images for a specific campaign
router.get('/:campaignId/images', async (req, res) => {
  try {
    const campaignImages = await CampaignImage.find({ 
      campaignId: req.params.campaignId 
    }).populate('imageId');
    
    const images = campaignImages.map(ci => ci.imageId);
    res.json(images);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST add image to campaign
router.post('/:campaignId/images', async (req, res) => {
  try {
    const campaignImage = new CampaignImage({
      campaignId: req.params.campaignId,
      imageId: req.body.imageId
    });
    
    await campaignImage.save();
    const populatedCI = await CampaignImage.findById(campaignImage._id).populate('imageId');
    res.status(201).json(populatedCI.imageId);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Image already added to campaign' });
    }
    res.status(400).json({ message: error.message });
  }
});

// Add these routes to your existing routes/campaignImages.js file

// POST bulk add images to campaign
router.post('/:campaignId/images/bulk', async (req, res) => {
  try {
    const { imageIds } = req.body;
    
    if (!Array.isArray(imageIds)) {
      return res.status(400).json({ message: 'imageIds must be an array' });
    }
    
    // Create campaign-image relationships
    const campaignImages = imageIds.map(imageId => ({
      campaignId: req.params.campaignId,
      imageId: imageId
    }));
    
    // Use insertMany with ordered: false to continue on duplicates
    const results = await CampaignImage.insertMany(campaignImages, { ordered: false });
    
    // Get the actual image data
    const addedImages = await Image.find({ 
      _id: { $in: results.map(r => r.imageId) } 
    });
    
    res.status(201).json(addedImages);
  } catch (error) {
    // Handle duplicate key errors gracefully
    if (error.code === 11000) {
      res.status(207).json({ 
        message: 'Some images were already in campaign, others added successfully',
        error: 'Duplicate entries skipped'
      });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

// DELETE bulk remove images from campaign
router.delete('/:campaignId/images/bulk', async (req, res) => {
  try {
    const { imageIds } = req.body;
    
    if (!Array.isArray(imageIds)) {
      return res.status(400).json({ message: 'imageIds must be an array' });
    }
    
    const result = await CampaignImage.deleteMany({
      campaignId: req.params.campaignId,
      imageId: { $in: imageIds }
    });
    
    res.json({ 
      message: `Removed ${result.deletedCount} images from campaign`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;