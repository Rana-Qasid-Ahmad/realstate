<<<<<<< HEAD
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Role '${req.user.role}' is not authorized` });
    }
=======
// ============================================================
// auth.js — Middleware to protect routes
// Middleware = a function that runs BEFORE the route handler
// ============================================================
 
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ----------------------------------------------------------
// protect: checks if the user is logged in
// Usage: router.get('/dashboard', protect, handler)
// ----------------------------------------------------------
exports.protect = async (req, res, next) => {
  try {
    // 1. Get the token from the request header
    // The header looks like: Authorization: Bearer eyJhbGci...
    const authHeader = req.headers.authorization;

    // 2. Check if the header exists and starts with "Bearer"
    if (!authHeader || !authHeader.startsWith('Bearer')) {
      return res.status(401).json({ message: 'No token provided. Please log in.' });
    }

    // 3. Extract just the token part (remove the word "Bearer ")
    const token = authHeader.split(' ')[1];

    // 4. Verify the token is valid and not expired
    // jwt.verify returns the decoded data we put in when we created the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5. Find the user in the database using the id from the token
    // .select('-password') means: get everything EXCEPT the password
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    // 6. Attach the user to the request so routes can use it
    // Now any route can do: req.user.name, req.user.role, etc.
    req.user = user;

    // 7. Call next() to move on to the actual route handler
    next();

  } catch (error) {
    return res.status(401).json({ message: 'Token is invalid or has expired.' });
  }
};

// ----------------------------------------------------------
// authorize: checks if the user has the right role
// Usage: router.post('/add', protect, authorize('agent', 'admin'), handler)
// ----------------------------------------------------------
exports.authorize = (...allowedRoles) => {
  // This returns a middleware function
  return (req, res, next) => {
    // Check if the user's role is in the allowed roles list
    const userRole = req.user.role;
    const isAllowed = allowedRoles.includes(userRole);

    if (!isAllowed) {
      return res.status(403).json({
        message: `Access denied. Your role (${userRole}) cannot do this.`
      });
    }

    // Role is allowed, continue
>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
    next();
  };
};
