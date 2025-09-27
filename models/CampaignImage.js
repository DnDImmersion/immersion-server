const mongoose = require('mongoose');

const campaignImageSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  imageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image',
    required: true
  }
}, {
  timestamps: true
});

// Prevent duplicate campaign-image pairs
campaignImageSchema.index({ campaignId: 1, imageId: 1 }, { unique: true });

module.exports = mongoose.model('CampaignImage', campaignImageSchema);