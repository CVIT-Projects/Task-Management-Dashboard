import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(express.json()); // Parses incoming JSON requests
app.use(cors({ origin: process.env.CLIENT_URL })); // Allows requests from our React app

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: "ok" });
});

// Routes placeholders (to be implemented later)
// app.use('/api/auth', authRoutes);
// app.use('/api/tasks', taskRoutes);

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
