import Project from '../models/Project.js';
import Task from '../models/Task.js';
import TimeEntry from '../models/TimeEntry.js';
import mongoose from 'mongoose';
import { logAudit } from '../utils/auditLogger.js';

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role !== 'admin') {
      // Regular users only see projects they are members of (or we can let them see all active projects)
      // Standard approach for tracking tools: users see all projects they can log time to.
      // We will leave filter empty for now so they can see all projects to filter their tasks against it,
      // or optionally restrict it. Let's restrict to members or no restriction depending on design.
      // Easiest is to allow them to see all projects for filtering purposes.
    }
    const projects = await Project.find(filter).sort({ name: 1 });
    
    // For admins, include basic budget stats for each project
    if (req.user.role === 'admin') {
      const projectIds = projects.map(p => p._id);
      
      // Aggregation: Project -> Tasks -> TimeEntries
      const stats = await TimeEntry.aggregate([
        {
          $lookup: {
            from: 'tasks',
            localField: 'task',
            foreignField: '_id',
            as: 'taskInfo'
          }
        },
        { $unwind: '$taskInfo' },
        { $match: { 'taskInfo.project': { $in: projectIds } } },
        {
          $group: {
            _id: '$taskInfo.project',
            actualHours: { $sum: { $divide: ['$duration', 3600] } },
            actualAmount: { $sum: '$earnedAmount' }
          }
        }
      ]);

      const statsMap = {};
      stats.forEach(s => { statsMap[String(s._id)] = s; });

      const projectsWithStats = projects.map(p => {
        const pObj = p.toJSON();
        const s = statsMap[String(p._id)] || { actualHours: 0, actualAmount: 0 };
        pObj.actualHours = s.actualHours;
        pObj.actualAmount = s.actualAmount;
        return pObj;
      });

      return res.json(projectsWithStats);
    }

    res.json(projects);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a project
// @route   POST /api/projects
// @access  Private/Admin
export const createProject = async (req, res, next) => {
  try {
    const project = await Project.create({
      ...req.body,
      createdBy: req.user.id
    });

    await logAudit(req.user.id, 'CREATE_PROJECT', 'Project', project._id, { name: project.name });

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private/Admin
export const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await logAudit(req.user.id, 'UPDATE_PROJECT', 'Project', project._id, { 
      name: project.name,
      changes: req.body 
    });

    res.json(project);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private/Admin
export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    
    // In production we might want to update tasks to null out the project reference
    await Task.updateMany({ project: req.params.id }, { project: null });
    
    await logAudit(req.user.id, 'DELETE_PROJECT', 'Project', req.params.id, { name: project.name });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tasks belonging to a specific project
// @route   GET /api/projects/:id/tasks
// @access  Private
export const getProjectTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ project: req.params.id })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

// @desc    Get project budget status
// @route   GET /api/projects/:id/budget
// @access  Private/Admin
export const getProjectBudget = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Sum time entries for all tasks in this project
    const stats = await TimeEntry.aggregate([
      {
        $lookup: {
          from: 'tasks',
          localField: 'task',
          foreignField: '_id',
          as: 'taskInfo'
        }
      },
      { $unwind: '$taskInfo' },
      { $match: { 'taskInfo.project': new mongoose.Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id: null,
          actualHours: { $sum: { $divide: ['$duration', 3600] } },
          actualAmount: { $sum: '$earnedAmount' }
        }
      }
    ]);

    const actual = stats[0] || { actualHours: 0, actualAmount: 0 };

    res.json({
      project: {
        id: project._id,
        name: project.name,
        budgetHours: project.budgetHours,
        budgetAmount: project.budgetAmount
      },
      actualHours: actual.actualHours,
      actualAmount: actual.actualAmount,
      hoursPercent: project.budgetHours > 0 ? (actual.actualHours / project.budgetHours) * 100 : 0,
      amountPercent: project.budgetAmount > 0 ? (actual.actualAmount / project.budgetAmount) * 100 : 0
    });
  } catch (error) {
    next(error);
  }
};
