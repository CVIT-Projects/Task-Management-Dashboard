import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['comment', 'activity'],
    default: 'comment'
  },
  metadata: {
    oldValue: String,
    newValue: String,
    action: String // e.g. 'timer_start', 'timer_stop', 'status_change'
  }
}, {
  timestamps: true
});

// Transform output to expose virtual id, remove _id and __v
commentSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
