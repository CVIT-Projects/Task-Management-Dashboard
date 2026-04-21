import express from 'express';
import { getMyNotifications, markAsRead } from '../controllers/notificationController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// All notification routes require authentication
router.use(verifyToken);

router.get('/', getMyNotifications);
router.patch('/:id/read', markAsRead);

export default router;
