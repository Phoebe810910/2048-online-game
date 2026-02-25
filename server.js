const express = require('express');
const cors = require('cors');
const app = express();

// Core Configuration
const PORT = process.env.PORT || 3000;
const MAX_CONCURRENT_PLAYERS = 30; // Maximum concurrent players
let activePlayers = 0; // Current active players
let playerSet = new Set(); // Deduplicated players to avoid double counting
let globalRankings = []; // Global leaderboard

// Middleware
app.use(cors());
app.use(express.json());

// 1. Check server availability status & online player count
app.get('/api/available', (req, res) => {
  res.json({
    available: activePlayers < MAX_CONCURRENT_PLAYERS,
    currentPlayers: activePlayers,
    maxPlayers: MAX_CONCURRENT_PLAYERS
  });
});

// 2. Player joins the game
app.post('/api/join', (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ success: false, message: 'Username is required' });
  }
  
  if (activePlayers >= MAX_CONCURRENT_PLAYERS) {
    return res.status(403).json({ success: false, message: 'Server is full (max 30 players). Please try again later.' });
  }

  // Deduplicate players to avoid the same user occupying multiple slots
  if (!playerSet.has(username)) {
    playerSet.add(username);
    activePlayers = playerSet.size;
  }

  res.json({ success: true, message: 'Joined game successfully' });
});

// 3. Player leaves the game, releases slot
app.post('/api/leave', (req, res) => {
  const { username } = req.body;
  if (username && playerSet.has(username)) {
    playerSet.delete(username);
    activePlayers = playerSet.size;
  }
  res.json({ success: true });
});

// 4. Submit score to global leaderboard
app.post('/api/submit-score', (req, res) => {
  const { username, score } = req.body;
  
  if (!username || score === undefined || score === null) {
    return res.status(400).json({ success: false, message: 'Username and valid score are required' });
  }

  // Add new score record
  globalRankings.push({
    username: username.trim(),
    score: parseInt(score),
    timestamp: new Date().toISOString()
  });

  // Sort: score descending, same score by time ascending, keep top 30
  globalRankings = globalRankings
    .sort((a, b) => b.score !== a.score ? b.score - a.score : new Date(a.timestamp) - new Date(b.timestamp))
    .slice(0, 30);

  res.json({ success: true, message: 'Score submitted successfully' });
});

// 5. Get global leaderboard
app.get('/api/rankings', (req, res) => {
  const formattedRankings = globalRankings.map((player, index) => ({
    rank: index + 1,
    username: player.username,
    score: player.score
  }));
  res.json(formattedRankings);
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('2048 Multiplayer Game Server is Running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Max concurrent players: ${MAX_CONCURRENT_PLAYERS}`);
});