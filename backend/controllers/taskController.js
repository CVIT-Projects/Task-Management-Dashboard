import Task from '../models/Task.js';
import TimeEntry from '../models/TimeEntry.js';

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

    // Find tasks, populate, and sort
    const tasks = await Task.find(filter)
      .populate('project', 'name color')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ deadline: 1 });

    // Aggregate tracked time for each task using Promise.all
    const tasksWithTracked = await Promise.all(
      tasks.map(async (task) => {
        const entries = await TimeEntry.find({ task: task._id });
        const trackedSeconds = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
        return { ...task.toJSON(), trackedSeconds };
      })
    );

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
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // Returns the updated document
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
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

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};
