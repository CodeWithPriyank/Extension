/**
 * Example Backend API Server
 * 
 * This is an example of how you could create a backend service
 * for the TabSound extension (e.g., for syncing settings, analytics, etc.)
 * 
 * To use: npm install express cors
 * Then run: node backend/api/example.js
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Example: Store extension settings
const settingsStore = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'tabsound-backend' });
});

// Example: Sync settings endpoint
app.post('/api/settings', (req, res) => {
  const { userId, settings } = req.body;
  settingsStore.set(userId, settings);
  res.json({ success: true, message: 'Settings saved' });
});

app.get('/api/settings/:userId', (req, res) => {
  const { userId } = req.params;
  const settings = settingsStore.get(userId) || {};
  res.json({ settings });
});

// Example: Analytics endpoint
app.post('/api/analytics', (req, res) => {
  const { event, data } = req.body;
  console.log('Analytics event:', event, data);
  // In production, store this in a database
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`TabSound backend server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

