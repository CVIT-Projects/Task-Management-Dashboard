import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import { createInternalNotification } from '../controllers/notificationController.js';

export const checkDeadlinesForUser = async (userId) => {
  try {
    const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const now = new Date();

    const tasks = await Task.find({
      assignedTo: userId,
      status: { $ne: 'Completed' },
      deadline: { $gte: now, $lte: twentyFourHoursFromNow }
    });

    for (const task of tasks) {
      // PROACTIVE DUPLICATE CLEANUP
      // If there are multiple deadline notifications for the same task, keep only the latest one
      const count = await Notification.countDocuments({ 
        userId, 
        taskId: task._id, 
        type: 'deadline_approaching' 
      });

      if (count > 1) {
        const latest = await Notification.findOne({ 
          userId, 
          taskId: task._id, 
          type: 'deadline_approaching' 
        }).sort({ createdAt: -1 });
        
        await Notification.deleteMany({ 
          userId, 
          taskId: task._id, 
          type: 'deadline_approaching', 
          _id: { $ne: latest._id } 
        });
      }

      // HOURLY RE-NOTIFICATION LOGIC
      const lastNotif = await Notification.findOne({
        userId,
        taskId: task._id,
        type: 'deadline_approaching'
      }).sort({ createdAt: -1 });

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Create new if none exists OR if the last one was sent > 1 hour ago
      if (!lastNotif || lastNotif.createdAt < oneHourAgo) {
        // Cleanup all existing ones before creating the fresh one
        await Notification.deleteMany({ 
          userId, 
          taskId: task._id, 
          type: 'deadline_approaching' 
        });

        const timeDiff = task.deadline - now;
        const hoursLeft = Math.round(timeDiff / (1000 * 60 * 60));
        
        await createInternalNotification(
          userId,
          `Reminder: Deadline approaching (in ~${hoursLeft}h) for task: ${task.taskName}`,
          'deadline_approaching',
          task._id
        );
      }
    }
  } catch (error) {
    console.error(`Error checking deadlines for user ${userId}:`, error);
  }
};

export const checkAllDeadlines = async () => {
  try {
    const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const now = new Date();

    const tasks = await Task.find({
      status: { $ne: 'Completed' },
      assignedTo: { $ne: null },
      deadline: { $gte: now, $lte: twentyFourHoursFromNow }
    });

    for (const task of tasks) {
      const lastNotif = await Notification.findOne({
        userId: task.assignedTo,
        taskId: task._id,
        type: 'deadline_approaching'
      }).sort({ createdAt: -1 });

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      if (!lastNotif || lastNotif.createdAt < oneHourAgo) {
        // Cleanup old ones for this task first
        await Notification.deleteMany({ 
          userId: task.assignedTo, 
          taskId: task._id, 
          type: 'deadline_approaching' 
        });

        const timeDiff = task.deadline - now;
        const hoursLeft = Math.round(timeDiff / (1000 * 60 * 60));
        
        await createInternalNotification(
          task.assignedTo,
          `Reminder: Deadline approaching (in ~${hoursLeft}h) for task: ${task.taskName}`,
          'deadline_approaching',
          task._id
        );
      }
    }
  } catch (error) {
    console.error('Error in global deadline check:', error);
  }
};
