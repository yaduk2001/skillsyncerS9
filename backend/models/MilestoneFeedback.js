const mongoose = require('mongoose');

const MilestoneFeedbackSchema = new mongoose.Schema(
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
    milestone: {
      type: Number,
      enum: [25, 50, 75, 100],
      required: true,
    },
    feedback: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    progressSnapshot: {
      type: Number,
      required: true,
    },
    tasksSummary: {
      total: {
        type: Number,
        default: 0,
      },
      completed: {
        type: Number,
        default: 0,
      },
      pending: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

// Unique constraint: one feedback per milestone per mentee per domain
MilestoneFeedbackSchema.index({ menteeId: 1, domain: 1, milestone: 1 }, { unique: true });

module.exports = mongoose.model('MilestoneFeedback', MilestoneFeedbackSchema);
