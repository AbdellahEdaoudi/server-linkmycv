const rateLimit = require('express-rate-limit');
const ms = require('ms');

exports.messageLimiter = rateLimit({
    windowMs: ms('2m'),
    max: 30,
    message: 'You have exceeded the maximum number of messages allowed. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });