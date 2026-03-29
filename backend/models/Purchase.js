const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
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
  // Payment tracking
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentAmount: {
    type: Number,
    default: 0
  },
  transactionId: {
    type: String,
    trim: true,
    default: ''
  },
  // Download tracking
  downloadEnabled: {
    type: Boolean,
    default: false        // only true when paymentStatus === 'paid'
  },
  downloadUrl: {
    type: String,
    trim: true,
    default: ''           // copied from ProjectTemplate.zipFileLink on purchase
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

purchaseSchema.index({ studentId: 1 });
purchaseSchema.index({ projectTemplateId: 1 });
purchaseSchema.index({ paymentStatus: 1 });
purchaseSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
