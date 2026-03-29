import WeeklyTimesheet from '../models/WeeklyTimesheet.js';

// @desc    Submit a weekly timesheet for approval
// @route   POST /api/timesheets/submit
// @access  Private
export const submitTimesheet = async (req, res, next) => {
  try {
    const { weekStart, weekEnd } = req.body;
    if (!weekStart || !weekEnd) {
      return res.status(400).json({ message: 'weekStart and weekEnd are required' });
    }

    const start = new Date(weekStart);
    const end = new Date(weekEnd);

    // Upsert: if already exists update status back to submitted (allow re-submission after rejection)
    const timesheet = await WeeklyTimesheet.findOneAndUpdate(
      { user: req.user.id, weekStart: start },
      {
        user: req.user.id,
        weekStart: start,
        weekEnd: end,
        status: 'submitted',
        adminNote: '',
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json(timesheet);
  } catch (error) {
    next(error);
  }
};

// @desc    Get timesheets (own for users; all for admins)
// @route   GET /api/timesheets
// @access  Private
export const getTimesheets = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role !== 'admin') {
      filter.user = req.user.id;
    } else if (req.query.userId) {
      filter.user = req.query.userId;
    }

    if (req.query.status) filter.status = req.query.status;

    const timesheets = await WeeklyTimesheet.find(filter)
      .populate('user', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ weekStart: -1 });

    res.json(timesheets);
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a timesheet
// @route   PATCH /api/timesheets/:id/approve
// @access  Private/Admin
export const approveTimesheet = async (req, res, next) => {
  try {
    const timesheet = await WeeklyTimesheet.findById(req.params.id);
    if (!timesheet) return res.status(404).json({ message: 'Timesheet not found' });
    if (timesheet.status !== 'submitted') {
      return res.status(400).json({ message: 'Only submitted timesheets can be approved' });
    }

    timesheet.status = 'approved';
    timesheet.reviewedAt = new Date();
    timesheet.reviewedBy = req.user.id;
    timesheet.adminNote = '';
    await timesheet.save();

    res.json(timesheet);
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a timesheet
// @route   PATCH /api/timesheets/:id/reject
// @access  Private/Admin
export const rejectTimesheet = async (req, res, next) => {
  try {
    const { adminNote } = req.body;
    const timesheet = await WeeklyTimesheet.findById(req.params.id);
    if (!timesheet) return res.status(404).json({ message: 'Timesheet not found' });
    if (timesheet.status !== 'submitted') {
      return res.status(400).json({ message: 'Only submitted timesheets can be rejected' });
    }

    timesheet.status = 'rejected';
    timesheet.reviewedAt = new Date();
    timesheet.reviewedBy = req.user.id;
    timesheet.adminNote = adminNote || '';
    await timesheet.save();

    res.json(timesheet);
  } catch (error) {
    next(error);
  }
};
