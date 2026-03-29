import express from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import {
  submitTimesheet,
  getTimesheets,
  approveTimesheet,
  rejectTimesheet
} from '../controllers/timesheetController.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getTimesheets);
router.post('/submit', submitTimesheet);
router.patch('/:id/approve', requireAdmin, approveTimesheet);
router.patch('/:id/reject', requireAdmin, rejectTimesheet);

export default router;
