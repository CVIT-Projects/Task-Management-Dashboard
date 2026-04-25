import express from 'express';
import { getSummaryReport, getDetailedReport, getBillingSummary, getProductivityReport } from '../controllers/reportController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/summary', getSummaryReport);
router.get('/detailed', getDetailedReport);
router.get('/billing', getBillingSummary);
router.get('/productivity', requireAdmin, getProductivityReport);

export default router;
