import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  taskName: {
    type: String,
    required: true,
    trim: true
  },
  assignedTo: {
    type: String,
    required: true,
    trim: true
  },
  startDateTime: {
    type: Date,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    default: null
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    required: true
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Completed', 'Blocked'],
    default: 'Not Started'
  },
  notes: {
    fileName: String,
    downloadUrl: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Transform output to expose virtual id, remove _id and __v
taskSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Task = mongoose.model('Task', taskSchema);

export default Task;
