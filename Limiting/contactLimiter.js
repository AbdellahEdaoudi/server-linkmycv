const rateLimit = require('express-rate-limit');
const ms = require('ms');

exports.contactLimiter = rateLimit({
    windowMs: ms('30m'),
    max: 3,
    message: 'You have exceeded the maximum number of messages allowed. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });