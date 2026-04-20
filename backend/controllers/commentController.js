import Comment from '../models/Comment.js';
import Task from '../models/Task.js';

// @desc    Add a comment or activity to a task
// @route   POST /api/comments/:taskId
// @access  Private
export const addComment = async (req, res, next) => {
  try {
    const { text, type, metadata } = req.body;
    const taskId = req.params.taskId;

    // Check if task exists and user has permission
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Permission check: owner or admin
    if (req.user.role !== 'admin' && String(task.assignedTo) !== req.user.id) {
       return res.status(403).json({ message: 'Not authorized to comment on this task' });
    }

    const comment = await Comment.create({
      task: taskId,
      user: req.user.id,
      text,
      type: type || 'comment',
      metadata
    });

    const populatedComment = await Comment.findById(comment._id).populate('user', 'name');

    res.status(201).json(populatedComment);
  } catch (error) {
    next(error);
  }
};

// @desc    Get comments/activities for a task
// @route   GET /api/comments/:taskId
// @access  Private
export const getComments = async (req, res, next) => {
  try {
    const taskId = req.params.taskId;

    // Check permission
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role !== 'admin' && String(task.assignedTo) !== req.user.id) {
       return res.status(403).json({ message: 'Not authorized to view comments for this task' });
    }

    const comments = await Comment.find({ task: taskId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    next(error);
  }
};

// Helper for internal use (e.g. logging activity from other controllers)
export const logActivity = async (taskId, userId, text, action, oldVal = null, newVal = null) => {
  try {
    await Comment.create({
      task: taskId,
      user: userId,
      text,
      type: 'activity',
      metadata: { action, oldValue: oldVal, newValue: newVal }
    });
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
};
