import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logAudit } from '../utils/auditLogger.js';

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, adminSecret } = req.body;

    // Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    // Check if email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    // Determine role (admin if they know the secret, otherwise user)
    let role = 'user';
    if (adminSecret && adminSecret === process.env.ADMIN_SECRET) {
      role = 'admin';
    }

    // Create the new user in database
    const user = await User.create({
      name,
      email,
      password,
      role
    });

    if (user) {
      res.status(201).json({
        token: generateToken(user),
        user: user.toJSON() // Safely returns user without password because of our schema transform
      });
    } else {
      res.status(400).json({ message: 'Invalid user data received' });
    }
  } catch (error) {
    next(error); // Pass to global error handler
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Search by email
    const user = await User.findOne({ email });

    // Validate user exists and password is correct (using our instance method)
    if (user && (await user.comparePassword(password))) {
      res.json({
        token: generateToken(user),
        user: user.toJSON()
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    // Return the user data attached by verifyToken middleware (from JWT)
    // This is fast and fires on every page load.
    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    // Fetch full user details for the Profile page.
    // Explicitly exclude password for defense in depth.
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new passwords' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password cannot be the same as the current password' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password (pre-save hook will handle hashing)
    user.password = newPassword;
    await user.save();

    // Log security-critical event
    await logAudit(req.user.id, 'CHANGE_PASSWORD', 'User', user._id, { 
      email: user.email,
      timestamp: new Date()
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};
