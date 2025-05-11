const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const ChatMessage = require('../models/ChatMessage');
const pool = require('../config/database');

// Authentication middleware
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Get chat messages
router.get('/messages', authenticate, async (req, res) => {
    try {
        console.log('Fetching messages for user:', req.user.id);
        
        // Using direct SQL query for MySQL
        const [messages] = await pool.execute(
            'SELECT * FROM chat_messages ORDER BY timestamp DESC LIMIT 100'
        );
        
        console.log(`Found ${messages.length} messages`);
        
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
});

// Search messages by content
router.get('/messages/search', authenticate, async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        
        console.log(`Searching messages with query: ${query}`);
        
        // Using direct SQL query with LIKE for MySQL
        const [messages] = await pool.execute(
            'SELECT * FROM chat_messages WHERE content LIKE ? ORDER BY timestamp DESC LIMIT 50',
            [`%${query}%`]
        );
        
        console.log(`Found ${messages.length} messages matching search`);
        
        res.status(200).json({
            success: true,
            data: messages
        });
    } catch (error) {
        console.error('Error searching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching messages'
        });
    }
});

// Get conversation statistics
router.get('/statistics', authenticate, async (req, res) => {
    try {
        // Count total messages
        const totalMessages = await ChatMessage.count();
        
        // Using direct MySQL queries for counts by type
        // Count messages by doctor type
        const [doctorResult] = await pool.execute(
            'SELECT COUNT(*) as count FROM chat_messages WHERE senderType = ?',
            ['doctor']
        );
        const doctorMessages = doctorResult[0].count;
        
        // Count messages by patient type
        const [patientResult] = await pool.execute(
            'SELECT COUNT(*) as count FROM chat_messages WHERE senderType = ?',
            ['patient']
        );
        const patientMessages = patientResult[0].count;
        
        // Get most active day (day with most messages) using MySQL's DATE function
        const [dayResult] = await pool.execute(
            'SELECT DATE(timestamp) as day, COUNT(*) as count FROM chat_messages GROUP BY DATE(timestamp) ORDER BY count DESC LIMIT 1'
        );
        
        const mostActiveDay = dayResult.length > 0 ? {
            date: dayResult[0].day,
            count: parseInt(dayResult[0].count)
        } : null;
        
        res.status(200).json({
            success: true,
            data: {
                totalMessages,
                byType: {
                    doctor: doctorMessages,
                    patient: patientMessages
                },
                mostActiveDay
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics'
        });
    }
});

module.exports = router; 