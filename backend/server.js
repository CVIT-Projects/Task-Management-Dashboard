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
import commentRoutes from './routes/comments.js';

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
await connectDB();

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' })); // Parses incoming JSON requests; limit prevents oversized payload attacks

// Relaxed CORS for local development to handle shifting Vite ports (5173, 5174, 5175, 5176)
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

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
app.use('/api/comments', commentRoutes);

// Serve React production build handled by app.yaml handlers
// No additional static serving code needed here.


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
