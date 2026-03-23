import jwt from 'jsonwebtoken';
import User from '../models/User.js';

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
    // req.user logic is handled securely by the verifyToken middleware before this runs
    res.json({ user: req.user.toJSON() });
  } catch (error) {
    next(error);
  }
};
