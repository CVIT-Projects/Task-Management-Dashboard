import Notification from '../models/Notification.js';
import { checkDeadlinesForUser } from '../utils/deadlineChecker.js';

export const getMyNotifications = async (req, res, next) => {
  try {
    // Perform an on-demand check for this user's deadlines
    await checkDeadlinesForUser(req.user.id);

    const notifications = await Notification.find({ userId: req.user.id })
      .populate('taskId', 'taskName deadline')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    if (String(notification.userId) !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: 'All notifications marked as read', count: result.modifiedCount });
  } catch (error) {
    next(error);
  }
};

// Utility function for internal use (doesn't need req/res)
export const createInternalNotification = async (userId, message, type, taskId = null) => {
  try {
    const data = { userId, message, type };
    if (taskId) data.taskId = taskId;
    await Notification.create(data);
  } catch (error) {
    console.error('Error creating internal notification:', error);
  }
};
