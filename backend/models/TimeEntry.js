import mongoose from 'mongoose';

const timeEntrySchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null }, // null = timer still running
    duration: { type: Number, default: 0 }, // in seconds, calculated on stop
    description: { type: String, default: '' },
    billable: { type: Boolean, default: false },
    hourlyRate: { type: Number, default: 0 },
    earnedAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Map _id to id similar to other models
timeEntrySchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

const TimeEntry = mongoose.model('TimeEntry', timeEntrySchema);

export default TimeEntry;
