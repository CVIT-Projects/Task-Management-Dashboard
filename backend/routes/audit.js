import express from 'express';
import AuditLog from '../models/AuditLog.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get paginated audit logs
// @route   GET /api/audit
// @access  Private/Admin
router.get('/', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.adminId) filter.adminId = req.query.adminId;
    
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) {
        const toDate = new Date(req.query.to);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('adminId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      logs,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    next(error);
  }
});

export default router;
