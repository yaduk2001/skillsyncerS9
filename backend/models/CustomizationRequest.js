const mongoose = require('mongoose');

const customizationRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required']
  },
  projectTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectTemplate',
    required: [true, 'Project template is required']
  },
  customizationDetails: {
    type: String,
    required: [true, 'Customization details are required'],
    trim: true,
    maxlength: [3000, 'Details cannot exceed 3000 characters']
  },
  assignedEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

customizationRequestSchema.index({ status: 1 });
customizationRequestSchema.index({ studentId: 1 });
customizationRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CustomizationRequest', customizationRequestSchema);
