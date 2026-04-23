import Task from '../models/Task.js';
import { logActivity } from '../controllers/commentController.js';
import { createInternalNotification } from '../controllers/notificationController.js';

export const processRecurringTasks = async () => {
  try {
    const now = new Date();
    
    // Find tasks that are recurring AND their deadline has passed
    const tasksToRecur = await Task.find({
      'recurring.enabled': true,
      deadline: { $lte: now }
    });

    if (tasksToRecur.length === 0) return;

    for (const task of tasksToRecur) {
      try {
        const nextStart = new Date(task.startDateTime);
        const nextDeadline = new Date(task.deadline);
        const freq = task.recurring.frequency;

        // Calculate next dates
        if (freq === 'daily') {
          nextStart.setDate(nextStart.getDate() + 1);
          nextDeadline.setDate(nextDeadline.getDate() + 1);
        } else if (freq === 'weekly') {
          nextStart.setDate(nextStart.getDate() + 7);
          nextDeadline.setDate(nextDeadline.getDate() + 7);
        } else if (freq === 'monthly') {
          nextStart.setMonth(nextStart.getMonth() + 1);
          nextDeadline.setMonth(nextDeadline.getMonth() + 1);
        }

        // Prepare new task payload
        const newTaskData = {
          taskName: task.taskName,
          assignedTo: task.assignedTo,
          project: task.project,
          priority: task.priority,
          isBillable: task.isBillable,
          tags: task.tags,
          startDateTime: nextStart,
          deadline: nextDeadline,
          recurring: task.recurring, // Transfer the recurring flag to the new task
          parentTask: task._id,
          createdBy: task.createdBy,
          status: 'Not Started'
        };

        const nextTask = await Task.create(newTaskData);

        // Turn off recurring for the old task so it doesn't duplicate again
        task.recurring.enabled = false;
        await task.save();

        // Log activity (system generated)
        // Assuming we need a user ID for logging. We can use the createdBy or leave it null if the schema allows
        const systemUserId = task.createdBy || null;
        if (systemUserId) {
          logActivity(
            nextTask._id,
            systemUserId,
            `Automated: Created as the next instance of recurring task #${task.id}`,
            'activity'
          );
        }

        // Notify the assignee
        if (nextTask.assignedTo) {
          await createInternalNotification(
            nextTask.assignedTo,
            `New recurring instance: ${nextTask.taskName}`,
            'task_assigned',
            nextTask.id
          );
        }
      } catch (innerErr) {
        console.error(`Failed to recur task ${task._id}:`, innerErr);
      }
    }
  } catch (error) {
    console.error('Error processing recurring tasks:', error);
  }
};
