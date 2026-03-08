// ============================================================
// auth.js — JWT protect middleware with Redis user caching
//
// WITHOUT Redis: every request = 1 MongoDB query
// WITH Redis:    first request = 1 MongoDB query + cache write
//               next requests for 5 min = 0 MongoDB queries
//
// At 10,000 concurrent users this saves ~9,500 DB queries/sec
// ============================================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');

const USER_CACHE_TTL = 300; // cache user for 5 minutes

exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer')) {
      return res.status(401).json({ message: 'No token provided. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 1. Try Redis cache first (fast path — no DB hit)
    const cacheKey = `user:${decoded.id}`;
    const cachedUser = await cacheGet(cacheKey);

    if (cachedUser) {
      req.user = cachedUser;
      return next();
    }

    // 2. Cache miss — hit MongoDB and populate cache
    const user = await User.findById(decoded.id)
      .select('-password -verificationCode -verificationCodeExpiry')
      .lean(); // .lean() returns plain JS object, 3x faster and less memory

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated.' });
    }

    // 3. Store in Redis for next 5 minutes
    await cacheSet(cacheKey, user, USER_CACHE_TTL);

    req.user = user;
    next();

  } catch (error) {
    return res.status(401).json({ message: 'Token is invalid or has expired.' });
  }
};

exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Your role (${req.user.role}) cannot do this.`
      });
    }
    next();
  };
};

// Call this whenever user data changes (role, isActive, name, etc.)
// Forces next request to re-fetch from DB instead of serving stale cache
exports.invalidateUserCache = async (userId) => {
  await cacheDel(`user:${userId}`);
};
