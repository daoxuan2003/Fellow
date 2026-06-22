const { rateLimit } = require('express-rate-limit');

function createLimiter({ windowMs, limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: { success: false, message }
  });
}

const loginRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: '登录尝试过于频繁，请 15 分钟后再试'
});

const registrationRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: '注册操作过于频繁，请稍后再试'
});

const pairingRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: '配对尝试过于频繁，请 15 分钟后再试'
});

module.exports = {
  loginRateLimiter,
  registrationRateLimiter,
  pairingRateLimiter
};
