import express from 'express';
import { addComment, getComments } from '../controllers/commentController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.post('/:taskId', addComment);
router.get('/:taskId', getComments);

export default router;
