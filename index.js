const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

let users = [];
let wallets = {};

// Register user
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const userExists = users.find(u => u.username === username);
  if (userExists) {
    return res.status(400).json({ message: 'Username already exists' });
  }
  users.push({ username, password });
  wallets[username] = 1000;
  res.json({ message: 'Registered successfully', balance: wallets[username] });
});

// Login user
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  res.json({ message: 'Login successful', balance: wallets[username] });
});

// Check wallet balance
app.get('/wallet/:username', (req, res) => {
  const username = req.params.username;
  if (!(username in wallets)) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ balance: wallets[username] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});