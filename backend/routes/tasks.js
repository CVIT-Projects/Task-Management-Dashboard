import express from 'express';
import { getTasks, getTask, createTask, updateTask, deleteTask } from '../controllers/taskController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply verifyToken to ALL routes in this file (must be logged in to read or write)
router.use(verifyToken);

// GET routes (open to all authenticated users)
router.get('/', getTasks);
router.get('/:id', getTask);

// POST/PUT/DELETE routes (restricted to admins only)
router.post('/', requireAdmin, createTask);
router.put('/:id', requireAdmin, updateTask);
router.delete('/:id', requireAdmin, deleteTask);

export default router;
