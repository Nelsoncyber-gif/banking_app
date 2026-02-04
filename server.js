const rateLimit = require('express-rate-limit');

require('dotenv').config();
const express = require('express');
const app = express();

// 👇 ADD BOTH MIDDLEWARE LINES
app.use(express.json()); // For JSON bodies
app.use(express.urlencoded({ extended: true })); // For form data

app.get('/', (req, res) => {
  res.send('Banking API is running');
});

const authRoutes = require('./routes/authRoutes');

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});