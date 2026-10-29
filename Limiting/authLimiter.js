const rateLimit = require('express-rate-limit');
const ms = require('ms');

// Login — strict limit to prevent brute force attacks
exports.loginLimiter = rateLimit({
  windowMs: ms('15m'),
  max: 10,
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register — prevent spam account creation
exports.registerLimiter = rateLimit({
  windowMs: ms('1h'),
  max: 5,
  message: { message: 'Too many registration attempts. Please try again after 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});
