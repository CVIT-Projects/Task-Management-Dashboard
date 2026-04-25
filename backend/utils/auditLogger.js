import AuditLog from '../models/AuditLog.js';

/**
 * Logs an administrative action for auditing purposes
 * @param {string} adminId - The ID of the admin performing the action
 * @param {string} action - Descriptive action key (e.g., 'CREATE_TASK')
 * @param {string} targetModel - The model name being affected
 * @param {string} targetId - The ID of the document being affected
 * @param {object} details - Any additional metadata or summary of changes
 */
export const logAudit = async (adminId, action, targetModel, targetId = null, details = {}) => {
  try {
    await AuditLog.create({
      adminId,
      action,
      targetModel,
      targetId,
      details
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // We don't want to fail the main transaction if logging fails, but we should know about it
  }
};
