const mongoose = require('mongoose');

const projectTemplateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  techStack: [{
    type: String,
    trim: true
  }],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  demoLink: {
    type: String,
    trim: true,
    default: ''
  },
  screenshotsLink: {
    type: String,
    trim: true,
    default: ''
  },
  zipFileLink: {
    type: String,
    trim: true,
    default: ''
  },
  domain: {
    type: String,
    trim: true,
    default: ''
  },
  features: [{
    type: String,
    trim: true
  }],
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

projectTemplateSchema.index({ category: 1 });
projectTemplateSchema.index({ status: 1 });
projectTemplateSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ProjectTemplate', projectTemplateSchema);
