import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getMe } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Limit auth endpoints to prevent brute-force and registration spam.
// Opt-out via DISABLE_AUTH_RATE_LIMIT=1 for e2e/UAT suites that hit auth repeatedly.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.DISABLE_AUTH_RATE_LIMIT === '1',
  message: { message: 'Too many requests, please try again later.' }
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', verifyToken, getMe);

export default router;
