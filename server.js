const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:5173", 
      "http://localhost:3001", 
      "http://127.0.0.1:5173"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors({
  origin: [
    "http://localhost:5173", 
    "http://localhost:3001", 
    "http://127.0.0.1:5173"
  ]
}));

app.use(express.json());

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Image display events
  socket.on('display-image', (imageData) => {
    io.emit('display-image', imageData);
  });

  socket.on('hide-display', () => {
    io.emit('hide-display');
  });

  // Spotify events
  socket.on('spotify-play', (data) => {
    io.emit('spotify-play', data);
  });

  socket.on('spotify-pause', () => {
    io.emit('spotify-pause');
  });

  socket.on('spotify-device-ready', (data) => {
    io.emit('spotify-device-ready', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes
const campaignRoutes = require('./routes/campaigns');
const imageRoutes = require('./routes/images');
const campaignImageRoutes = require('./routes/campaignImages');
const spotifyRoutes = require('./routes/spotify');

app.use('/api/campaigns', campaignRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/campaign-images', campaignImageRoutes);
app.use('/api/spotify', spotifyRoutes);

// Basic route to test
app.get('/', (req, res) => {
  res.json({ message: 'DM Dashboard API is running!' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export io for use in routes if needed
module.exports = { io };