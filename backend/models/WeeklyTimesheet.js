import mongoose from 'mongoose';

const weeklyTimesheetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weekStart: { type: Date, required: true }, // Monday 00:00:00
  weekEnd:   { type: Date, required: true }, // Sunday 23:59:59
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'submitted'
  },
  adminNote: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt:  { type: Date, default: null },
  reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

// One submission per user per week
weeklyTimesheetSchema.index({ user: 1, weekStart: 1 }, { unique: true });

weeklyTimesheetSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  }
});

const WeeklyTimesheet = mongoose.model('WeeklyTimesheet', weeklyTimesheetSchema);

export default WeeklyTimesheet;
