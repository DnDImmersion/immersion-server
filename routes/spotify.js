const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

let accessToken = null;
let refreshToken = null;

// OAuth login URL
router.get('/login', (req, res) => {
  const scopes = [
    'user-read-playback-state',
    'user-modify-playback-state',
    'playlist-read-private',
    'playlist-read-collaborative',
    'streaming',
    'user-read-email',        // ADD THIS
    'user-read-private'       // ADD THIS
  ];

  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${process.env.SPOTIFY_CLIENT_ID}&scope=${scopes.join('%20')}&redirect_uri=${encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI)}`;

  res.json({ authUrl });
});

// Handle OAuth callback
router.post('/callback', async (req, res) => {
  try {
    const { code } = req.body;

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI
      })
    });

    const data = await response.json();

    if (data.access_token) {
      accessToken = data.access_token;
      refreshToken = data.refresh_token;
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Failed to get access token', details: data });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get access token for display
router.get('/token', (req, res) => {
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ access_token: accessToken });
});

// Get available devices
router.get('/devices', async (req, res) => {
  try {
    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's playlists
router.get('/playlists', async (req, res) => {
  try {
    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Play playlist on specific device
router.post('/play', async (req, res) => {
  try {
    const { playlistUri, deviceId } = req.body;

    let url = 'https://api.spotify.com/v1/me/player/play';
    if (deviceId) {
      url += `?device_id=${deviceId}`;
    }

    const body = playlistUri ? { context_uri: playlistUri } : {};

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    res.json({ success: response.ok });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pause playback
router.post('/pause', async (req, res) => {
  try {
    await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add these routes to your existing Spotify router

// Resume playback (continue from where paused)
router.post('/resume', async (req, res) => {
  try {
    const { deviceId } = req.body;

    let url = 'https://api.spotify.com/v1/me/player/play';
    if (deviceId) {
      url += `?device_id=${deviceId}`;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}) // Empty body to resume current track
    });

    res.json({ success: response.ok });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle shuffle mode
router.put('/shuffle', async (req, res) => {
  try {
    const { state } = req.body; // true or false

    const response = await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${state}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    res.json({ success: response.ok });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current playback state
router.get('/current-playback', async (req, res) => {
  try {
    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const response = await fetch('https://api.spotify.com/v1/me/player', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.status === 204) {
      // No active device
      return res.json({ data: null });
    }

    const data = await response.json();
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Skip to next track
router.post('/next', async (req, res) => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/next', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    res.json({ success: response.ok });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Skip to previous track
router.post('/previous', async (req, res) => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/previous', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    res.json({ success: response.ok });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;