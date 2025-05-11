const ChatMessage = require('../models/Chat');

// @desc    Get chat messages
// @route   GET /api/chat/messages
// @access  Private
exports.getMessages = async (req, res) => {
    try {
        const messages = await ChatMessage.find()
            .sort({ timestamp: -1 })
            .limit(100); // Limit to last 100 messages

        res.status(200).json({
            success: true,
            data: messages.reverse() // Return in chronological order
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching messages'
        });
    }
};

// @desc    Save a new message
// @route   POST /api/chat/messages
// @access  Private
exports.saveMessage = async (req, res) => {
    try {
        const { content } = req.body;
        
        const message = await ChatMessage.create({
            userId: req.user._id,
            name: req.user.name,
            role: req.user.role,
            content
        });

        res.status(201).json({
            success: true,
            data: message
        });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving message'
        });
    }
}; 