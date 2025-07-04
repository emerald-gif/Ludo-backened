const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

let users = [];
let wallets = {};
let matchQueue = [];
let matches = [];

// ✅ Match Options
const matchOptions = [
  { players: 2, stake: 30, prize: 50, commission: 10 },     // 2×30 = 60 → 50 + 10
  { players: 2, stake: 50, prize: 85, commission: 15 },     // 2×50 = 100 → 85 + 15
  { players: 2, stake: 100, prize: 160, commission: 40 },   // 2×100 = 200 → 160 + 40
  { players: 2, stake: 300, prize: 480, commission: 120 },  // 2×300 = 600 → 480 + 120
  { players: 2, stake: 500, prize: 800, commission: 200 },  // 2×500 = 1000 → 800 + 200
  { players: 2, stake: 1000, prize: 1700, commission: 300 },// 2×1000 = 2000 → 1700 + 300
  { players: 2, stake: 2000, prize: 3200, commission: 800 },// 2×2000 = 4000 → 3200 + 800
  { players: 2, stake: 5000, prize: 8000, commission: 2000 } // 2×5000 = 10000 → 8000 + 2000
];

// ✅ Register
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ message: 'Username already exists' });
  }
  users.push({ username, password });
  wallets[username] = 1000;
  res.json({ message: 'Registered successfully', balance: wallets[username] });
});

// ✅ Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ message: 'Login successful', balance: wallets[username] });
});

// ✅ Check Wallet
app.get('/wallet/:username', (req, res) => {
  const username = req.params.username;
  if (!(username in wallets)) return res.status(404).json({ message: 'User not found' });
  res.json({ balance: wallets[username] });
});

// ✅ Match Options Filtered By Wallet
app.get('/match-options/:username', (req, res) => {
  const username = req.params.username;
  if (!wallets[username]) return res.status(404).json({ message: 'User not found' });

  const balance = wallets[username];
  const availableMatches = matchOptions.filter(m => balance >= m.stake);

  res.json({ username, balance, availableMatches });
});

// ✅ Join Match Queue
let ongoingMatches = [];

app.post('/join-match', (req, res) => {
  const { username, stake, players } = req.body;

  if (!wallets[username] || wallets[username] < stake) {
    return res.status(400).json({ message: 'Insufficient balance' });
  }

  // Deduct stake immediately
  wallets[username] -= stake;

  const matchKey = `${players}-${stake}`;
  let queue = matchQueue.find(q => q.key === matchKey);

  if (!queue) {
    queue = { key: matchKey, players: [], stake, max: players };
    matchQueue.push(queue);
  }

  queue.players.push(username);

  if (queue.players.length === queue.max) {
    // All players ready → Create match
    const prize = matchOptions.find(m => m.players === players && m.stake === stake)?.prize || 0;
    const winner = queue.players[Math.floor(Math.random() * queue.players.length)];
    wallets[winner] += prize;

    ongoingMatches.push({
      players: queue.players,
      stake,
      winner,
      prize,
      id: Date.now().toString() + "-" + Math.floor(Math.random()*1000)
    });

    matchQueue = matchQueue.filter(q => q.key !== matchKey);
  }

  res.json({ message: 'Joined match. Waiting for others...', matchKey });
});

// ✅ Declare Winner
app.post('/declare-winner', (req, res) => {
  const { matchId, winner } = req.body;
  const match = matches.find(m => m.id === matchId);

  if (!match) return res.status(404).json({ message: 'Match not found' });
  if (!match.participants.includes(winner)) {
    return res.status(400).json({ message: 'Invalid winner' });
  }

  if (match.status === 'completed') {
    return res.status(400).json({ message: 'Match already completed' });
  }

  wallets[winner] += match.prize;
  match.status = 'completed';
  match.winner = winner;

  res.json({
    message: 'Winner declared and paid',
    winner,
    prize: match.prize,
    newBalance: wallets[winner]
  });
});

app.get('/match-result/:username', (req, res) => {
  const { username } = req.params;

  const match = ongoingMatches.find(m => m.players.includes(username));
  if (!match) {
    return res.json({ status: 'waiting' });
  }

  res.json({
    status: 'complete',
    winner: match.winner,
    prize: match.prize,
    players: match.players
  });

  // Remove after sending result once
  ongoingMatches = ongoingMatches.filter(m => !m.players.includes(username));
});

// ✅ Server Listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ludo backend running on port ${PORT}`);
});
