const rateLimit = require('express-rate-limit');
const ms = require('ms');

exports.linksLimiter = rateLimit({
    windowMs: ms('15m'),
    max: 10,
    message: 'You have exceeded the maximum number of messages allowed. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });