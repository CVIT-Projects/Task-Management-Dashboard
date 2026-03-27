import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  startTimer,
  stopTimer,
  getMyTimeEntries,
  deleteTimeEntry,
  createManualEntry
} from '../controllers/timeController.js';

const router = express.Router();

// Require user to be logged in for all time entry routes
router.use(verifyToken);

router.route('/')
  .get(getMyTimeEntries)
  .post(createManualEntry);

router.post('/start', startTimer);
router.patch('/:id/stop', stopTimer);
router.delete('/:id', deleteTimeEntry);

export default router;
