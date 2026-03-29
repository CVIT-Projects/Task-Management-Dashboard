import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/users.js';
import timeEntryRoutes from './routes/timeEntries.js';
import projectRoutes from './routes/projects.js';
import reportRoutes from './routes/reports.js';
import timesheetRoutes from './routes/timesheets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env file specifically
dotenv.config({ path: path.join(__dirname, '.env') });

// Fail fast if critical env vars are missing
const REQUIRED_ENV = ['JWT_SECRET', 'MONGO_URI'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' })); // Parses incoming JSON requests; limit prevents oversized payload attacks
const allowedOrigin = process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173');
app.use(cors({ origin: allowedOrigin })); // In production CLIENT_URL must be set explicitly

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/timesheets', timesheetRoutes);

// Serve React production build
app.use(express.static(path.join(__dirname, '../dist')));

// Catch-all: for any non-API route, serve React's index.html
// This supports client-side routing (e.g. /login, /register)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
