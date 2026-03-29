import express from 'express';
import User from '../models/User.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all users (for admin dropdown)
// @route   GET /api/users
// @access  Private/Admin
router.get('/', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    // Return id, name, email, role, hourlyRate
    const users = await User.find().select('name email role hourlyRate').sort({ name: 1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// @desc    Update user hourly rate
// @route   PUT /api/users/:id/rate
// @access  Private/Admin
router.put('/:id/rate', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const { hourlyRate } = req.body;
    const rate = Number(hourlyRate);
    if (isNaN(rate) || rate < 0 || rate > 99999) {
      return res.status(400).json({ message: 'Hourly rate must be a number between 0 and 99999' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.hourlyRate = rate;
    await user.save();
    
    res.json({ message: 'Hourly rate updated', user });
  } catch (error) {
    next(error);
  }
});

export default router;
