# DM Immersion Dashboard

A web application for D&D Dungeon Masters to manage and display visual content (creatures, locations, maps) during game sessions. Features a dashboard for content management and a separate display interface for TV/projector presentation.

## Project Structure

dm-dashboard/
├── server/          # Express.js backend
│   ├── models/      # MongoDB schemas
│   ├── routes/      # API endpoints
│   └── server.js    # Main server file
├── client/          # React frontend (to be created)
└── README.md

## Tech Stack
- **Backend:** Node.js, Express.js, MongoDB (Mongoose), Socket.io
- **Frontend:** React (planned)
- **Image Storage:** Cloudinary
- **Real-time:** WebSocket for dashboard ↔ display sync

## Features (Current/Planned)
- [x] Image library management (creatures, locations, NPCs, maps)
- [x] Campaign organization
- [x] REST API for CRUD operations
- [ ] Real-time display sync between dashboard and TV
- [ ] React dashboard interface
- [ ] TV display interface
- [ ] Unsplash API integration for additional content
- [ ] Spotify integration for session music

## Database Schema

### Campaign
- name (String, required)
- description (String)
- isActive (Boolean)
- timestamps

### Image
- cloudinaryUrl (String, required)
- cloudinaryId (String, required)
- category (enum: creature/location/npc/item/map/background)
- name (String, required)
- tags (Array of strings)
- timestamps

### CampaignImage (Many-to-Many)
- campaignId (ObjectId ref Campaign)
- imageId (ObjectId ref Image)
- timestamps

## Environment Variables

PORT=5000
MONGO_URI=mongodb+srv://[username]:[password]@[cluster].mongodb.net/

## API Endpoints

### Campaigns
- GET /api/campaigns - Get all campaigns
- POST /api/campaigns - Create new campaign
- PUT /api/campaigns/:id/activate - Set active campaign

### Images
- GET /api/images?category=creature&tags=dragon - Get images with filters
- POST /api/images - Add new image to library

### Campaign Images (to be created)
- GET /api/campaigns/:id/images - Get images for specific campaign
- POST /api/campaigns/:id/images - Add image to campaign
- DELETE /api/campaigns/:id/images/:imageId - Remove image from campaign

## Development Setup

cd server
npm install
npm run dev

## Current Status
- ✅ Basic Express server with MongoDB
- ✅ Mongoose models created
- ✅ Campaign and Image CRUD routes
- 🔄 Testing API endpoints
- ⏳ Campaign-Image relationship routes
- ⏳ React frontend
- ⏳ Real-time WebSocket integration

## Next Steps
1. Complete API testing
2. Create campaign-image relationship routes
3. Set up React frontend
4. Implement dashboard UI
5. Create TV display interface
6. Add WebSocket real-time sync

## Marketing Concept
"DM Immersion Tool" - Transform D&D sessions from theater of the mind to cinematic visual experience with seamless image display and session management.# immersion-server
