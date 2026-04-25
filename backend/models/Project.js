import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#6366f1' // default indigo color
  },
  billable: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Active', 'Archived'],
    default: 'Active'
  },
  budgetHours: {
    type: Number,
    default: 0
  },
  budgetAmount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

projectSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Project = mongoose.model('Project', projectSchema);
export default Project;
