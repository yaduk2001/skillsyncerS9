const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    // Context scoping for mentor-mentee chats
    contextType: {
        type: String,
        enum: ['internship', 'project'],
        default: null
    },
    contextId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'contextTypeRef',
        default: null
    },
    contextTypeRef: {
        type: String,
        enum: ['InternshipApplication', null],
        default: null
    },
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
chatSchema.index({ sender: 1, receiver: 1 });
chatSchema.index({ createdAt: 1 });
chatSchema.index({ sender: 1, receiver: 1, contextType: 1, contextId: 1 });

module.exports = mongoose.model('Chat', chatSchema);
