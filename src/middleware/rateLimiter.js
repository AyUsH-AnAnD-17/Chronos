const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 requests per windowMs
  'Too many authentication attempts, please try again later.'
);

const jobLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  10, // limit each IP to 10 job submissions per minute
  'Too many job submissions, please try again later.'
);

module.exports = { authLimiter, jobLimiter };