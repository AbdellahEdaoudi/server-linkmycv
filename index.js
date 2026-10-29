require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookiesParser = require('cookie-parser');

const { connectDB } = require('./config/dbConnect');
const { corsOption } = require(path.join(__dirname, 'config', 'corsOptions'));

const app = express();
const PORT = process.env.PORT || 9999;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors(corsOption));
app.options(/.*/, cors(corsOption)); // Handle preflight for all routes (Express 5 compatible)
app.use(cookiesParser());
app.use(express.json());

// ─── Database ─────────────────────────────────────────────────────────────────
connectDB().catch(console.error);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth.routes'));
app.use('/api/users',    require('./routes/user.routes'));
app.use('/api/contacts', require('./routes/contact.routes'));
app.use('/api/admin',    require('./routes/admin.routes'));

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use('/', express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Views', 'index.html'));
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404);
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, 'Views', '404.html'));
  } else if (req.accepts('json')) {
    res.json({ message: '404 Not Found' });
  } else {
    res.type('txt').send('404 Not Found');
  }
});

// ─── Export for Vercel Serverless / Start locally ────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;