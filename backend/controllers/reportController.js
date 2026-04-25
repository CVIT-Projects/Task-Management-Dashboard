import TimeEntry from '../models/TimeEntry.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
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
      { $unwind: { path: '$taskInfo', preserveNullAndEmptyArrays: true } }
    ];

    if (groupBy === 'project') {
        pipeline.push(
            { $group: {
                _id: '$taskInfo.project',
                totalSeconds: { $sum: '$duration' },
                billableSeconds: { $sum: { $cond: ['$billable', '$duration', 0] } },
                count: { $sum: 1 }
            }},
            { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'groupInfo' } }
        );
    } else if (groupBy === 'user') {
        pipeline.push(
            { $group: {
                _id: '$user',
                totalSeconds: { $sum: '$duration' },
                billableSeconds: { $sum: { $cond: ['$billable', '$duration', 0] } },
                count: { $sum: 1 }
            }},
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'groupInfo' } }
        );
    } else {
        pipeline.push(
            { $group: {
                _id: '$task',
                totalSeconds: { $sum: '$duration' },
                billableSeconds: { $sum: { $cond: ['$billable', '$duration', 0] } },
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
      .populate('user', 'name email')
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

// @desc    Get per-user productivity report
// @route   GET /api/reports/productivity
// @access  Private/Admin
export const getProductivityReport = async (req, res, next) => {
  try {
    const { from, to, userId } = req.query;

    // Filters
    const timeFilter = {};
    const taskFilter = {};

    if (userId) {
      timeFilter.user = new mongoose.Types.ObjectId(userId);
      taskFilter.assignedTo = new mongoose.Types.ObjectId(userId);
    }

    if (from || to) {
      timeFilter.startTime = {};
      // For tasks, we filter by endTime (completion date) for completed stats,
      // but "overdue" is based on deadline.
      if (from) timeFilter.startTime.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        timeFilter.startTime.$lte = toDate;
      }
    }

    // 1. Get Time Stats
    const timeStats = await TimeEntry.aggregate([
      { $match: timeFilter },
      {
        $group: {
          _id: '$user',
          totalSeconds: { $sum: '$duration' },
          billableSeconds: { $sum: { $cond: ['$billable', '$duration', 0] } }
        }
      }
    ]);

    // 2. Get Task Stats
    // We need to look at tasks that were either completed in the period 
    // OR are currently overdue.
    const taskPipeline = [
      { $match: taskFilter },
      {
        $group: {
          _id: '$assignedTo',
          completedCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } 
          },
          onTimeCount: { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $eq: ['$status', 'Completed'] },
                    { $lte: ['$endTime', '$deadline'] }
                  ] 
                }, 
                1, 
                0
              ] 
            } 
          },
          overdueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'Completed'] },
                    { $lt: ['$deadline', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ];
    
    // If date range is provided, we only count tasks COMPLETED in that range for the "completed" stat?
    // Usually, productivity reports are about output in a period.
    if (from || to) {
      // Re-evaluate task stats for the period
      // completedCount: endTime within period
      // onTimeCount: endTime within period AND endTime <= deadline
      // overdueCount: deadline within period AND status !== Completed OR endTime > deadline?
      // Let's simplify: 
      // Tasks Completed in period: status=Completed AND endTime in range
      // Tasks Overdue: (status!=Completed AND deadline < toDate) OR (status=Completed AND endTime > deadline AND endTime in range)
      
      const rangeStart = from ? new Date(from) : new Date(0);
      const rangeEnd = to ? new Date(to) : new Date();
      rangeEnd.setHours(23, 59, 59, 999);

      taskPipeline[0].$match.$or = [
        { endTime: { $gte: rangeStart, $lte: rangeEnd } },
        { deadline: { $gte: rangeStart, $lte: rangeEnd }, status: { $ne: 'Completed' } }
      ];
      
      // Update group conditions to be range-aware
      taskPipeline[1].$group.completedCount = {
        $sum: { 
          $cond: [
            { 
              $and: [
                { $eq: ['$status', 'Completed'] },
                { $gte: ['$endTime', rangeStart] },
                { $lte: ['$endTime', rangeEnd] }
              ] 
            }, 
            1, 
            0
          ] 
        }
      };
      
      taskPipeline[1].$group.onTimeCount = {
        $sum: { 
          $cond: [
            { 
              $and: [
                { $eq: ['$status', 'Completed'] },
                { $gte: ['$endTime', rangeStart] },
                { $lte: ['$endTime', rangeEnd] },
                { $lte: ['$endTime', '$deadline'] }
              ] 
            }, 
            1, 
            0
          ] 
        }
      };

      taskPipeline[1].$group.overdueCount = {
        $sum: {
          $cond: [
            {
              $or: [
                // Still incomplete and deadline passed (within range or before range end)
                {
                  $and: [
                    { $ne: ['$status', 'Completed'] },
                    { $lt: ['$deadline', rangeEnd] }
                  ]
                },
                // Completed but missed deadline (completed within range)
                {
                  $and: [
                    { $eq: ['$status', 'Completed'] },
                    { $gt: ['$endTime', '$deadline'] },
                    { $gte: ['$endTime', rangeStart] },
                    { $lte: ['$endTime', rangeEnd] }
                  ]
                }
              ]
            },
            1,
            0
          ]
        }
      };
    }

    const taskStats = await Task.aggregate(taskPipeline);

    // 3. Get all users to ensure everyone is listed (if admin viewing team)
    const userQuery = userId ? { _id: userId } : {};
    const users = await User.find(userQuery, 'name email');

    // 4. Combine
    const report = users.map(user => {
      const tStat = timeStats.find(s => s._id && String(s._id) === String(user._id)) || { totalSeconds: 0, billableSeconds: 0 };
      const kStat = taskStats.find(s => s._id && String(s._id) === String(user._id)) || { completedCount: 0, onTimeCount: 0, overdueCount: 0 };

      const totalHours = tStat.totalSeconds / 3600;
      const billableHours = tStat.billableSeconds / 3600;
      const billablePercent = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
      const onTimeRate = kStat.completedCount > 0 ? (kStat.onTimeCount / kStat.completedCount) * 100 : 0;

      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        totalHours,
        billableHours,
        billablePercent,
        tasksCompleted: kStat.completedCount,
        tasksOverdue: kStat.overdueCount,
        onTimeRate
      };
    });

    res.json(report);
  } catch (error) {
    next(error);
  }
};
