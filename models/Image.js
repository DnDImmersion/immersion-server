const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  cloudinaryUrl: {
    type: String,
    required: true
  },
  cloudinaryId: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['creature', 'location', 'npc', 'item', 'map', 'background']
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Image', imageSchema);