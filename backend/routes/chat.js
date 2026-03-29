const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @desc    Send a message
// @route   POST /api/chat/send
// @access  Private
router.post('/send', protect, async (req, res) => {
    try {
        const { receiverId, message, contextType, contextId } = req.body;

        if (!receiverId || !message) {
            return res.status(400).json({ success: false, message: 'Receiver ID and message are required' });
        }

        // Validate contextType if provided
        if (contextType && !['internship', 'project'].includes(contextType)) {
            return res.status(400).json({ success: false, message: 'Invalid contextType. Must be "internship" or "project"' });
        }

        const messageData = {
            sender: req.user._id,
            receiver: receiverId,
            message
        };

        // Add context scoping if provided
        if (contextType && contextId) {
            messageData.contextType = contextType;
            messageData.contextId = contextId;
            messageData.contextTypeRef = contextType === 'internship' ? 'InternshipApplication' : null;
        }

        const newMessage = await Chat.create(messageData);

        const populatedMessage = await Chat.findById(newMessage._id)
            .populate('sender', 'name email')
            .populate('receiver', 'name email');

        res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: 'Error sending message' });
    }
});

// @desc    Get chat history with a specific user
// @route   GET /api/chat/history/:userId
// @route   GET /api/chat/messages (with query params for context scoping)
// @access  Private
router.get('/history/:userId', protect, async (req, res) => {
    try {
        const { userId } = req.params;
        const { contextType, contextId } = req.query;
        const currentUserId = req.user._id;

        const query = {
            $or: [
                { sender: currentUserId, receiver: userId },
                { sender: userId, receiver: currentUserId }
            ]
        };

        // Add context scoping if provided
        if (contextType && contextId) {
            query.contextType = contextType;
            query.contextId = contextId;
        } else {
            // If no context provided, get messages without context (legacy support)
            query.$or = [
                { sender: currentUserId, receiver: userId, contextType: null },
                { sender: userId, receiver: currentUserId, contextType: null }
            ];
        }

        const messages = await Chat.find(query)
            .sort({ createdAt: 1 })
            .populate('sender', 'name email')
            .populate('receiver', 'name email');

        // Mark received messages as read
        await Chat.updateMany(
            { sender: userId, receiver: currentUserId, read: false },
            { $set: { read: true } }
        );

        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ success: false, message: 'Error fetching chat history' });
    }
});

// @desc    Get context-scoped chat messages
// @route   GET /api/chat/messages
// @access  Private
router.get('/messages', protect, async (req, res) => {
    try {
        const { mentorId, jobseekerId, contextType, contextId } = req.query;
        const currentUserId = req.user._id;

        // Security: Ensure user is either mentor or jobseeker in the conversation
        if (mentorId && jobseekerId) {
            const isMentor = currentUserId.toString() === mentorId.toString();
            const isJobseeker = currentUserId.toString() === jobseekerId.toString();
            
            if (!isMentor && !isJobseeker) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        }

        if (!mentorId || !jobseekerId || !contextType || !contextId) {
            return res.status(400).json({ 
                success: false, 
                message: 'mentorId, jobseekerId, contextType, and contextId are required' 
            });
        }

        const query = {
            $or: [
                { sender: mentorId, receiver: jobseekerId },
                { sender: jobseekerId, receiver: mentorId }
            ],
            contextType: contextType,
            contextId: contextId
        };

        const messages = await Chat.find(query)
            .sort({ createdAt: 1 })
            .populate('sender', 'name email')
            .populate('receiver', 'name email');

        // Mark received messages as read
        await Chat.updateMany(
            { 
                sender: currentUserId.toString() === mentorId.toString() ? jobseekerId : mentorId,
                receiver: currentUserId,
                read: false,
                contextType: contextType,
                contextId: contextId
            },
            { $set: { read: true } }
        );

        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Error fetching context-scoped messages:', error);
        res.status(500).json({ success: false, message: 'Error fetching messages' });
    }
});

// @desc    Get unread count
// @route   GET /api/chat/unread
// @access  Private
router.get('/unread', protect, async (req, res) => {
    try {
        const unreadCount = await Chat.countDocuments({
            receiver: req.user._id,
            read: false
        });
        res.json({ success: true, count: unreadCount });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ success: false, message: 'Error fetching unread count' });
    }
});

module.exports = router;
