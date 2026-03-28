import Project from '../models/Project.js';
import Task from '../models/Task.js';

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
