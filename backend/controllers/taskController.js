import Task from '../models/Task.js';
import TimeEntry from '../models/TimeEntry.js';
import Comment from '../models/Comment.js';
import { logActivity } from './commentController.js';
import { createInternalNotification } from './notificationController.js';

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private (All authenticated users)
export const getTasks = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'admin') {
      // Admins can optionally filter by user, or see everything
      if (req.query.assignedTo) {
        filter.assignedTo = req.query.assignedTo === 'me' 
          ? req.user.id 
          : req.query.assignedTo;
      }
      // No filter = all tasks
    } else {
      // Regular users ALWAYS only see their own tasks — non-negotiable
      filter.assignedTo = req.user.id;
    }

    if (req.query.project) {
      filter.project = req.query.project;
    }

    if (req.query.tag) {
      filter.tags = req.query.tag;
    }

    // Find tasks, populate, and sort
    const tasks = await Task.find(filter)
      .populate('project', 'name color')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ deadline: 1 });

    // Single aggregation to get total tracked seconds per task (avoids N+1 queries)
    const taskIds = tasks.map(t => t._id);
    const trackedAgg = await TimeEntry.aggregate([
      { $match: { task: { $in: taskIds } } },
      { $group: { _id: '$task', trackedSeconds: { $sum: '$duration' } } }
    ]);
    const trackedMap = {};
    trackedAgg.forEach(t => { trackedMap[String(t._id)] = t.trackedSeconds; });

    const tasksWithTracked = tasks.map(task => ({
      ...task.toJSON(),
      trackedSeconds: trackedMap[String(task._id)] || 0
    }));

    res.json(tasksWithTracked);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
export const getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name color')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Role-based access control: regular users can only see tasks assigned to them
    if (req.user.role !== 'admin' && String(task.assignedTo?._id) !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this task' });
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private/Admin
export const createTask = async (req, res, next) => {
  try {
    const taskData = { ...req.body, createdBy: req.user.id };

    // Only set notes if both fileName and downloadUrl exist in the request
    if (taskData.notes && (!taskData.notes.fileName || !taskData.notes.downloadUrl)) {
      delete taskData.notes;
    }

    const task = await Task.create(taskData);
    if (task.assignedTo) {
      await createInternalNotification(
        task.assignedTo,
        `New task assigned: ${task.taskName}`,
        'task_assigned',
        task.id
      );
    }
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private/Admin
export const updateTask = async (req, res, next) => {
  try {
    const originalTask = await Task.findById(req.params.id);
    if (!originalTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // Returns the updated document
    );

    // Trigger notification if reassigned
    if (req.body.assignedTo && String(req.body.assignedTo) !== String(originalTask.assignedTo)) {
      await createInternalNotification(
        req.body.assignedTo,
        `Task reassigned to you: ${task.taskName}`,
        'task_assigned',
        task.id
      );
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private/Admin
export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Cleanup: Delete orphaned comments and time entries associated with this task
    await Promise.all([
      Comment.deleteMany({ task: req.params.id }),
      TimeEntry.deleteMany({ task: req.params.id })
    ]);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task status (User or Admin)
// @route   PATCH /api/tasks/:id/status
// @access  Private
export const updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Not Started', 'In Progress', 'Completed', 'Blocked'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // A regular user can only update tasks assigned to them. Admins can update any.
    if (req.user.role !== 'admin' && String(task.assignedTo) !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to change this task status' });
    }

    const oldStatus = task.status;
    task.status = status;
    
    // Auto-record the exact completion date/time
    if (status === 'Completed') {
      task.endTime = new Date();
    } else {
      task.endTime = null; // Re-open task if changed away from Completed
    }

    await task.save();

    // Log the activity (fire-and-forget)
    logActivity(
      task._id, 
      req.user.id, 
      `Changed status from ${oldStatus} to ${status}`, 
      'status_change', 
      oldStatus, 
      status
    );

    res.json(task);
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks due soon (next 24 hours)
// @route   GET /api/tasks/due-soon
// @access  Private
export const getDueSoonTasks = async (req, res, next) => {
  try {
    const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const now = new Date();

    const tasks = await Task.find({
      assignedTo: req.user.id,
      status: { $ne: 'Completed' },
      deadline: { $gte: now, $lte: twentyFourHoursFromNow }
    })
    .populate('project', 'name color')
    .sort({ deadline: 1 });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
};
