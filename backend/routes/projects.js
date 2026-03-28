import express from 'express';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getProjectTasks
} from '../controllers/projectController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(verifyToken, getProjects)
  .post(verifyToken, requireAdmin, createProject);

router.route('/:id')
  .put(verifyToken, requireAdmin, updateProject)
  .delete(verifyToken, requireAdmin, deleteProject);

router.route('/:id/tasks')
  .get(verifyToken, getProjectTasks);

export default router;
