const mongoose = require('mongoose');

const MentorMeetingSchema = new mongoose.Schema(
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
    dateTime: {
      type: Date,
      required: true,
      index: true,
    },
    link: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: '',
    },
    targetMentees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
  },
  { timestamps: true }
);

MentorMeetingSchema.index({ mentorId: 1, dateTime: 1 });

module.exports = mongoose.model('MentorMeeting', MentorMeetingSchema);

