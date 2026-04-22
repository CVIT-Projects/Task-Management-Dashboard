import TimeEntry from '../models/TimeEntry.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import WeeklyTimesheet from '../models/WeeklyTimesheet.js';
import { logActivity } from './commentController.js';

// Helper to check if a specific date belongs to an approved timesheet week
const isWeekLocked = async (userId, date) => {
  if (!date) return false;
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const approvedTimesheet = await WeeklyTimesheet.findOne({
    user: userId,
    weekStart: monday,
    status: 'approved'
  });
  return !!approvedTimesheet;
};

// @desc    Start a new timer for a task
// @route   POST /api/time-entries/start
// @access  Private
export const startTimer = async (req, res, next) => {
  try {
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ message: 'Task ID is required' });

    // Enforce Singleton: Stop any currently running timer for this user
    const activeTimer = await TimeEntry.findOne({ user: req.user.id, endTime: null });
    if (activeTimer) {
      activeTimer.endTime = new Date();
      activeTimer.duration = Math.floor((activeTimer.endTime - activeTimer.startTime) / 1000);
      await activeTimer.save();
    }

    // Fetch Task and User to capture snapshot pricing
    const taskObj = await Task.findById(taskId);
    if (!taskObj) return res.status(404).json({ message: 'Task not found' });
    const fullUser = await User.findById(req.user.id);

    // Start new timer natively inheriting billing rules
    const newEntry = await TimeEntry.create({
      task: taskId,
      user: req.user.id,
      startTime: new Date(),
      billable: taskObj.isBillable || false,
      hourlyRate: fullUser ? (fullUser.hourlyRate || 0) : 0
    });

    if (taskObj.status === 'Not Started') {
      taskObj.status = 'In Progress';
      await taskObj.save();
    }

    // Log activity: Started timer (fire-and-forget)
    logActivity(
      taskId, 
      req.user.id, 
      'Started timer', 
      'timer_start'
    );

    res.status(201).json({ message: 'Timer started', entry: newEntry, previousStopped: !!activeTimer });
  } catch (error) {
    next(error);
  }
};

// @desc    Stop an active timer
// @route   PATCH /api/time-entries/:id/stop
// @access  Private
export const stopTimer = async (req, res, next) => {
  try {
    const entry = await TimeEntry.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!entry) return res.status(404).json({ message: 'Time entry not found' });
    if (entry.endTime) return res.status(400).json({ message: 'Timer is already stopped' });

    entry.endTime = new Date();
    entry.duration = Math.floor((entry.endTime - entry.startTime) / 1000);
    
    // Auto-compute earnedAmount based on snapshotted rate
    if (entry.billable) {
      const hours = entry.duration / 3600;
      entry.earnedAmount = hours * entry.hourlyRate;
    }

    await entry.save();

    // Log activity: Stopped timer (fire-and-forget)
    logActivity(
      entry.task, 
      req.user.id, 
      `Stopped timer (${Math.floor(entry.duration / 60)}m ${entry.duration % 60}s tracked)`, 
      'timer_stop'
    );

    res.json(entry);
  } catch (error) {
    next(error);
  }
};

// @desc    Get my time entries
// @route   GET /api/time-entries
// @access  Private
export const getMyTimeEntries = async (req, res, next) => {
  try {
    const filter = {};
    
    // Admin override support for Timesheet
    if (req.user.role === 'admin' && req.query.user) {
      filter.user = req.query.user === 'me' ? req.user.id : req.query.user;
    } else {
      filter.user = req.user.id;
    }
    
    if (req.query.taskId) filter.task = req.query.taskId;

    // Optional date range filtering could be added here
    if (req.query.from || req.query.to) {
        filter.startTime = {};
        if (req.query.from) filter.startTime.$gte = new Date(req.query.from);
        // Include the entire end day
        if (req.query.to) {
          const toDate = new Date(req.query.to);
          toDate.setHours(23, 59, 59, 999);
          filter.startTime.$lte = toDate;
        }
    }

    const entries = await TimeEntry.find(filter)
      .populate('task', 'taskName')
      .sort({ startTime: -1 });
      
    res.json(entries);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete my time entry
// @route   DELETE /api/time-entries/:id
// @access  Private
export const deleteTimeEntry = async (req, res, next) => {
  try {
    // 1. Fetch entry to check date
    const entry = await TimeEntry.findOne({ _id: req.params.id, user: req.user.id });
    if (!entry) return res.status(404).json({ message: 'Time entry not found or unauthorized' });

    // 2. Check if week is approved
    if (await isWeekLocked(req.user.id, entry.startTime)) {
      return res.status(403).json({ message: 'Cannot delete entries from an approved timesheet week.' });
    }

    await entry.deleteOne();
    res.json({ message: 'Time entry deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Create manual entry
// @route   POST /api/time-entries
// @access  Private
export const createManualEntry = async (req, res, next) => {
    try {
        const { taskId, startTime, endTime } = req.body;
        if (!taskId || !startTime || !endTime) {
            return res.status(400).json({ message: 'Task ID, start time, and end time are required' });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        const duration = Math.floor((end - start) / 1000);

        if (duration <= 0) {
            return res.status(400).json({ message: 'End time must be after start time' });
        }

        // Check task for manual entry snapshotting
        const taskObj = await Task.findById(taskId);
        const fullUser = await User.findById(req.user.id);
        const billable = taskObj ? taskObj.isBillable : false;
        const rate = fullUser ? (fullUser.hourlyRate || 0) : 0;
        let earnedAmount = 0;
        
        if (billable) {
            earnedAmount = (duration / 3600) * rate;
        }

        const newEntry = await TimeEntry.create({
            task: taskId,
            user: req.user.id,
            startTime: start,
            endTime: end,
            duration,
            billable,
            hourlyRate: rate,
            earnedAmount
        });

        res.status(201).json(newEntry);
    } catch (error) {
        next(error);
    }
};

// @desc    Update a time entry
// @route   PUT /api/time-entries/:id
// @access  Private
export const updateTimeEntry = async (req, res, next) => {
  try {
    const { startTime, endTime, description, billable, taskId } = req.body;
    
    // 1. Ownership & Existence Check
    const entry = await TimeEntry.findOne({ _id: req.params.id, user: req.user.id });
    if (!entry) return res.status(404).json({ message: 'Time entry not found or unauthorized' });

    // 2. Approved Timesheet Check (Original Week)
    if (await isWeekLocked(req.user.id, entry.startTime)) {
      return res.status(403).json({ message: 'Cannot edit entries for an approved timesheet week.' });
    }

    // 3. Update Fields & Approved Timesheet Check (Target Week)
    if (taskId) entry.task = taskId;
    if (description !== undefined) entry.description = description;
    if (billable !== undefined) entry.billable = billable;
    
    if (startTime || endTime) {
      const newStart = startTime ? new Date(startTime) : entry.startTime;
      const newEnd = endTime ? new Date(endTime) : entry.endTime;

      if (newEnd && newEnd <= newStart) {
        return res.status(400).json({ message: 'End time must be after start time' });
      }

      // If startTime is changing, check if the target week is locked
      if (startTime && (new Date(startTime).getTime() !== new Date(entry.startTime).getTime())) {
        if (await isWeekLocked(req.user.id, newStart)) {
          return res.status(403).json({ message: 'Cannot move time entries into an approved timesheet week.' });
        }
      }

      entry.startTime = newStart;
      entry.endTime = newEnd;

      if (entry.endTime) {
        entry.duration = Math.floor((entry.endTime - entry.startTime) / 1000);
      }
    }

    // 4. Recalculate earnedAmount
    if (entry.billable && entry.duration > 0) {
      // Re-fetch user to get current hourlyRate if needed, or keep snapshotted?
      // Requirement says "Backend recalculates ... on update". 
      // Usually, we use the original snapshotted hourlyRate unless requested otherwise.
      // If none exists, we fetch from user.
      if (!entry.hourlyRate) {
        const fullUser = await User.findById(req.user.id);
        entry.hourlyRate = fullUser ? (fullUser.hourlyRate || 0) : 0;
      }
      entry.earnedAmount = (entry.duration / 3600) * entry.hourlyRate;
    } else {
      entry.earnedAmount = 0;
    }

    await entry.save();
    
    // Log activity
    logActivity(
      entry.task, 
      req.user.id, 
      `Updated time entry (${Math.floor(entry.duration / 60)}m tracked)`, 
      'timer_update'
    );

    res.json(entry);
  } catch (error) {
    next(error);
  }
};
