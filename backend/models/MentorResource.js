const mongoose = require('mongoose');

const MentorResourceSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ['pdf', 'doc', 'ppt', 'video', 'url'],
      required: true,
      default: 'url',
      index: true,
    },
    url: {
      type: String,
      trim: true,
      default: '',
    },
    // NOTE: file uploads can be added later (e.g. cloudinaryUrl)
    visibility: {
      type: String,
      enum: ['domain'],
      default: 'domain',
    },
  },
  { timestamps: true }
);

MentorResourceSchema.index({ mentorId: 1, domain: 1, createdAt: -1 });

module.exports = mongoose.model('MentorResource', MentorResourceSchema);

