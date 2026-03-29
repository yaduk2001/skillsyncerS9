const mongoose = require('mongoose');

const MentorSubmissionSchema = new mongoose.Schema(
  {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    menteeId: {
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
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MentorTask',
      default: null,
      index: true,
    },
    submissionType: {
      type: String,
      enum: ['link', 'files', 'text'],
      default: 'link',
    },
    link: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 8000,
      default: '',
    },
    files: [
      {
        name: { type: String, trim: true },
        url: { type: String, trim: true },
      },
    ],
    viewed: {
      type: Boolean,
      default: false,
      index: true,
    },
    viewedAt: {
      type: Date,
      default: null,
    },
    reviewStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    mentorFeedback: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    submissionVersion: {
      type: Number,
      default: 1,
    },
    previousSubmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MentorSubmission',
      default: null,
    },
  },
  { timestamps: true }
);

MentorSubmissionSchema.index({ mentorId: 1, viewed: 1, createdAt: -1 });

module.exports = mongoose.model('MentorSubmission', MentorSubmissionSchema);

