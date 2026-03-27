import Task from '../models/Task.js';

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

    // Find tasks, populate, and sort
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ deadline: 1 });
    res.json(tasks);
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
      { new: true } // Returns the updated document
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
