const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');

// GET all campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new campaign
router.post('/', async (req, res) => {
  try {
    const campaign = new Campaign({
      name: req.body.name,
      description: req.body.description,
      isActive: req.body.isActive || false
    });
    
    const savedCampaign = await campaign.save();
    res.status(201).json(savedCampaign);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT set active campaign
router.put('/:id/activate', async (req, res) => {
  try {
    // Set all campaigns to inactive
    await Campaign.updateMany({}, { isActive: false });
    
    // Set this campaign to active
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    res.json(campaign);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;