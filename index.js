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
  { players: 2, stake: 30, prize: 50  },
  { players: 2, stake: 50, prize: 85 },
  { players: 2, stake: 100, prize: 160  },
  { players: 2, stake: 300, prize: 480  },
  { players: 2, stake: 500, prize: 800   },
  { players: 2, stake: 1000, prize: 1700 },
  { players: 2, stake: 2000, prize: 3200 },
  { players: 2, stake: 5000, prize: 8000 }
  
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
app.post('/join-match', (req, res) => {
  const { username, stake, players } = req.body;

  if (!wallets[username] || wallets[username] < stake) {
    return res.status(400).json({ message: 'Insufficient balance' });
  }

  const match = matchOptions.find(m => m.stake === stake && m.players === players);
  if (!match) return res.status(404).json({ message: 'Invalid match config' });

  wallets[username] -= stake;
  matchQueue.push({ username, stake, players });

  const group = matchQueue.filter(m => m.stake === stake && m.players === players);
  if (group.length === players) {
    const participants = group.map(p => p.username);
    const matchId = Date.now().toString();

    matches.push({
      id: matchId,
      participants,
      stake,
      players,
      prize: match.prize,
      status: 'waiting'
    });

    matchQueue = matchQueue.filter(p => !participants.includes(p.username));

    return res.json({
      message: 'Match started',
      matchId,
      participants,
      prize: match.prize
    });
  }

  res.json({ message: 'Waiting for other players...' });
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

// ✅ Server Listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ludo backend running on port ${PORT}`);
});
