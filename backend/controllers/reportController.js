import TimeEntry from '../models/TimeEntry.js';
import mongoose from 'mongoose';

// @desc    Get summary report (totals by group)
// @route   GET /api/reports/summary
// @access  Private
export const getSummaryReport = async (req, res, next) => {
  try {
    const { from, to, groupBy = 'task', userId, projectId } = req.query;

    const filter = {};
    
    // Security layer: Standard users only see their own data
    if (req.user.role !== 'admin') {
      filter.user = new mongoose.Types.ObjectId(req.user.id);
    } else if (userId) {
      filter.user = new mongoose.Types.ObjectId(userId);
    }

    if (from || to) {
      filter.startTime = {};
      if (from) filter.startTime.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.startTime.$lte = toDate;
      }
    }

    if (projectId) {
      // Since TimeEntry doesn't have a direct project field, we might need a lookup if grouped by project
      // But for task/user it's simpler. Let's handle project via lookup.
    }

    let groupField = '';
    let lookupField = '';
    let fromCollection = '';
    let asField = '';

    if (groupBy === 'user') {
      groupField = '$user';
      lookupField = '_id';
      fromCollection = 'users';
      asField = 'groupInfo';
    } else if (groupBy === 'task') {
      groupField = '$task';
      lookupField = '_id';
      fromCollection = 'tasks';
      asField = 'groupInfo';
    } else if (groupBy === 'project') {
      // This requires reaching through Task to Project
      // We'll handle this specially in the pipeline
    }

    const pipeline = [
      { $match: filter },
      // Join Task for Project info
      {
        $lookup: {
          from: 'tasks',
          localField: 'task',
          foreignField: '_id',
          as: 'taskInfo'
        }
      },
      { $unwind: '$taskInfo' }
    ];

    if (groupBy === 'project') {
        pipeline.push(
            { $group: {
                _id: '$taskInfo.project',
                totalSeconds: { $sum: '$duration' },
                billableSeconds: { $sum: { $cond: [{ $eq: ['$taskInfo.priority', 'High'] }, '$duration', 0] } }, // Simulated billable logic based on priority for now
                count: { $sum: 1 }
            }},
            { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'groupInfo' } }
        );
    } else if (groupBy === 'user') {
        pipeline.push(
            { $group: {
                _id: '$user',
                totalSeconds: { $sum: '$duration' },
                billableSeconds: { $sum: { $cond: [{ $eq: ['$taskInfo.priority', 'High'] }, '$duration', 0] } },
                count: { $sum: 1 }
            }},
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'groupInfo' } }
        );
    } else {
        pipeline.push(
            { $group: {
                _id: '$task',
                totalSeconds: { $sum: '$duration' },
                billableSeconds: { $sum: { $cond: [{ $eq: ['$taskInfo.priority', 'High'] }, '$duration', 0] } },
                count: { $sum: 1 }
            }},
            { $lookup: { from: 'tasks', localField: '_id', foreignField: '_id', as: 'groupInfo' } }
        );
    }

    pipeline.push(
      { $unwind: { path: '$groupInfo', preserveNullAndEmptyArrays: true } },
      { $project: {
        group: { $ifNull: ['$groupInfo.name', { $ifNull: ['$groupInfo.taskName', { $ifNull: ['$groupInfo.username', 'Unknown'] }] }] },
        totalSeconds: 1,
        billableSeconds: 1,
        entries: '$count'
      }},
      { $sort: { totalSeconds: -1 } }
    );

    const report = await TimeEntry.aggregate(pipeline);
    res.json(report);
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed report (raw list with filters)
// @route   GET /api/reports/detailed
// @access  Private
export const getDetailedReport = async (req, res, next) => {
  try {
    const { from, to, userId, projectId } = req.query;
    const filter = {};

    if (req.user.role !== 'admin') {
      filter.user = req.user.id;
    } else if (userId) {
      filter.user = userId;
    }

    if (from || to) {
      filter.startTime = {};
      if (from) filter.startTime.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.startTime.$lte = toDate;
      }
    }

    const entries = await TimeEntry.find(filter)
      .populate({
          path: 'task',
          populate: { path: 'project', select: 'name color' }
      })
      .populate('user', 'username name')
      .sort({ startTime: -1 });

    // Optional project filtering since it's nested
    const filteredEntries = projectId 
      ? entries.filter(e => e.task?.project?._id.toString() === projectId)
      : entries;

    res.json(filteredEntries);
  } catch (error) {
    next(error);
  }
};

// @desc    Get billing summary (totals)
// @route   GET /api/reports/billing
// @access  Private
export const getBillingSummary = async (req, res, next) => {
  try {
    const { from, to, userId, projectId } = req.query;
    const filter = {};

    if (req.user.role !== 'admin') {
      filter.user = req.user.id;
    } else if (userId) {
      filter.user = userId;
    }

    if (from || to) {
      filter.startTime = {};
      if (from) filter.startTime.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.startTime.$lte = toDate;
      }
    }

    const entries = await TimeEntry.find(filter).populate('task');
    const filtered = projectId 
      ? entries.filter(e => e.task?.project?.toString() === projectId)
      : entries;

    let totalSeconds = 0;
    let billableSeconds = 0;
    let nonBillableSeconds = 0;
    let totalEarned = 0;

    filtered.forEach(e => {
       const d = e.duration || 0;
       totalSeconds += d;
       if (e.billable) {
         billableSeconds += d;
         totalEarned += e.earnedAmount || 0;
       } else {
         nonBillableSeconds += d;
       }
    });

    res.json({
      totalHours: totalSeconds / 3600,
      billableHours: billableSeconds / 3600,
      nonBillableHours: nonBillableSeconds / 3600,
      totalEarned: totalEarned
    });
  } catch (error) {
    next(error);
  }
};
