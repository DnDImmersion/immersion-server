const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Get allowed origins from environment variable or use defaults
const getAllowedOrigins = () => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',');
  }
  
  // Default origins for development
  return [
    "http://localhost:5173",
    "http://localhost:3001", 
    "http://127.0.0.1:5173"
  ];
};

const allowedOrigins = getAllowedOrigins();
console.log('Allowed origins:', allowedOrigins);

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors({
  origin: allowedOrigins
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
    console.log('Broadcasting display-image to all clients');
    io.emit('display-image', imageData);
  });

  socket.on('hide-display', () => {
    console.log('Broadcasting hide-display to all clients');
    io.emit('hide-display');
  });

  // Spotify events
  socket.on('spotify-play', (data) => {
    console.log('Broadcasting spotify-play to all clients:', data);
    io.emit('spotify-play', data);
  });

  socket.on('spotify-pause', () => {
    console.log('Broadcasting spotify-pause to all clients');
    io.emit('spotify-pause');
  });

  socket.on('spotify-resume', () => {
    console.log('Broadcasting spotify-resume to all clients');
    io.emit('spotify-resume');
  });

  socket.on('spotify-shuffle', (data) => {
    console.log('Broadcasting spotify-shuffle to all clients:', data);
    io.emit('spotify-shuffle', data);
  });

  socket.on('spotify-device-ready', (data) => {
    console.log('Broadcasting spotify-device-ready to all clients:', data);
    io.emit('spotify-device-ready', data);
  });

  socket.on('spotify-authenticated', () => {
    console.log('Dashboard authenticated with Spotify, broadcasting to all clients');
    io.emit('spotify-authenticated');
  });

  // New event for track changes
  socket.on('spotify-track-changed', (trackData) => {
    console.log('Broadcasting spotify-track-changed to all clients:', trackData);
    io.emit('spotify-track-changed', trackData);
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

// Health check route for deployment
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    allowedOrigins: allowedOrigins 
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Export io for use in routes if needed
module.exports = { io };