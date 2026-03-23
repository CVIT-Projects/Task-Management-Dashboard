import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const verifyToken = (req, res, next) => {
  let token;

  // Check if authorization header exists and has the Bearer format
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from string "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // Verify the token using our secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach decoded payload directly to req.user
      req.user = decoded;

      next(); // Move to the actual route handler
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // If no token was found in the header
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

export const requireAdmin = (req, res, next) => {
  // Check if user is attached (via verifyToken) and has admin role
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Not authorized as an admin' });
  }
};
