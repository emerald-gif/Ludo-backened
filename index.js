// ✅ Ludo Backend with Bonus Lock, Deposit Notice & Withdrawal Rule

const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

let users = [];
let wallets = {};
let deposits = {}; // track if user has deposited
let matchQueue = [];
let ongoingMatches = [];

const matchOptions = [
  { players: 2, stake: 30, prize: 50, commission: 10 },
  { players: 2, stake: 50, prize: 85, commission: 15 },
  { players: 2, stake: 100, prize: 160, commission: 40 },
  { players: 2, stake: 300, prize: 480, commission: 120 },
  { players: 2, stake: 500, prize: 800, commission: 200 },
  { players: 2, stake: 1000, prize: 1700, commission: 300 },
  { players: 2, stake: 2000, prize: 3200, commission: 800 },
  { players: 2, stake: 5000, prize: 8000, commission: 2000 }
];

// ✅ Register
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ message: 'Username already exists' });
  }
  users.push({ username, password });
  wallets[username] = 1000; // Give free ₦1000
  deposits[username] = false; // User has not deposited yet
  res.json({ message: 'Registered successfully', balance: 1000 });
});

// ✅ Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ message: 'Login successful', balance: wallets[username] });
});

// ✅ Wallet Balance
app.get('/wallet/:username', (req, res) => {
  const username = req.params.username;
  if (!(username in wallets)) return res.status(404).json({ message: 'User not found' });
  res.json({ balance: wallets[username] });
});

// ✅ Match Options
app.get('/match-options/:username', (req, res) => {
  const username = req.params.username;
  if (!wallets[username]) return res.status(404).json({ message: 'User not found' });

  const balance = wallets[username];
  const availableMatches = matchOptions.filter(m => balance >= m.stake);

  res.json({ username, balance, availableMatches });
});

// ✅ Join Match
app.post('/join-match', (req, res) => {
  const { username, stake, players } = req.body;
  if (!wallets[username] || wallets[username] < stake) {
    return res.status(400).json({ message: 'Insufficient balance' });
  }

  wallets[username] -= stake;

  const matchKey = `${players}-${stake}`;
  let queue = matchQueue.find(q => q.key === matchKey);
  if (!queue) {
    queue = { key: matchKey, players: [], stake, max: players };
    matchQueue.push(queue);
  }

  queue.players.push(username);

  if (queue.players.length === players) {
    const matchOption = matchOptions.find(m => m.players === players && m.stake === stake);
    const prize = matchOption?.prize || 0;
    const winner = queue.players[Math.floor(Math.random() * queue.players.length)];

    // ✅ Handle bonus lock
    if (wallets[winner] < 1000 || deposits[winner]) {
      wallets[winner] += prize;
    } else {
      console.log(`⚠️ Bonus limit: ${winner} is still at ₦1000 cap, winnings not added.`);
    }

    ongoingMatches.push({
      players: queue.players,
      stake,
      winner,
      prize,
      id: Date.now().toString() + '-' + Math.floor(Math.random() * 1000)
    });

    matchQueue = matchQueue.filter(q => q.key !== matchKey);
  }

  res.json({ message: 'Joined match. Waiting for others...', matchKey });
});

// ✅ Match Result
app.get('/match-result/:username', (req, res) => {
  const { username } = req.params;
  const match = ongoingMatches.find(m => m.players.includes(username));

  if (!match) {
    return res.json({ status: 'waiting' });
  }

  const bonusCapped = wallets[match.winner] >= 1000 && deposits[match.winner] === false;

  res.json({
    status: 'complete',
    winner: match.winner,
    prize: match.prize,
    players: match.players,
    bonusLimitNotice: bonusCapped ? 'Bonus capped — deposit required to earn more.' : null
  });

  ongoingMatches = ongoingMatches.filter(m => !m.players.includes(username));
});

// ✅ Deposit
app.post('/deposit/:username', (req, res) => {
  const username = req.params.username;
  const { amount } = req.body;

  if (!wallets[username]) return res.status(404).json({ message: 'User not found' });

  wallets[username] += amount;
  deposits[username] = true;

  res.json({ message: 'Deposit successful', balance: wallets[username] });
});

// ✅ Withdraw
app.post('/withdraw/:username', (req, res) => {
  const username = req.params.username;
  const { amount } = req.body;

  if (!wallets[username]) return res.status(404).json({ message: 'User not found' });
  if (amount < 1000) return res.status(400).json({ message: 'Minimum withdrawal is ₦1000' });
  if (wallets[username] < amount) return res.status(400).json({ message: 'Insufficient balance' });

  wallets[username] -= amount;
  res.json({ message: `₦${amount} withdrawn successfully`, balance: wallets[username] });
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎮 Ludo backend running on port ${PORT}`);
});
