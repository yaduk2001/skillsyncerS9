const mongoose = require('mongoose');

const MentorTaskSchema = new mongoose.Schema(
  {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: '',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    link: {
      type: String,
      trim: true,
      default: '',
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

MentorTaskSchema.index({ mentorId: 1, domain: 1, createdAt: -1 });

module.exports = mongoose.model('MentorTask', MentorTaskSchema);

