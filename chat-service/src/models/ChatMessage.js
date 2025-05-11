const pool = require('../config/database');

// ChatMessage model using direct MySQL queries
class ChatMessage {
    // Create a new chat message
    static async create(messageData) {
        const { sender, senderName, senderType, content, timestamp = new Date() } = messageData;
        
        try {
            const [result] = await pool.execute(
                'INSERT INTO chat_messages (sender, senderName, senderType, content, timestamp, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [sender, senderName, senderType, content, timestamp, new Date(), new Date()]
            );
            
            const id = result.insertId;
            return { id, ...messageData, timestamp };
        } catch (error) {
            console.error('Error creating chat message:', error);
            throw error;
        }
    }
    
    // Find all messages with optional limit
    static async findAll(options = {}) {
        const { limit = 100, orderBy = 'timestamp', order = 'DESC' } = options;
        
        try {
            const [rows] = await pool.execute(
                `SELECT * FROM chat_messages ORDER BY ${orderBy} ${order} LIMIT ?`,
                [limit]
            );
            
            return rows;
        } catch (error) {
            console.error('Error finding chat messages:', error);
            throw error;
        }
    }
    
    // Count total messages
    static async count() {
        try {
            const [rows] = await pool.execute('SELECT COUNT(*) as count FROM chat_messages');
            return rows[0].count;
        } catch (error) {
            console.error('Error counting chat messages:', error);
            throw error;
        }
    }
    
    // Initialize the database table
    static async initTable() {
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    sender VARCHAR(50) NOT NULL,
                    senderName VARCHAR(100) NOT NULL,
                    senderType ENUM('doctor', 'patient') NOT NULL,
                    content TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    createdAt DATETIME NOT NULL,
                    updatedAt DATETIME NOT NULL,
                    INDEX idx_sender (sender),
                    INDEX idx_senderType (senderType),
                    INDEX idx_timestamp (timestamp)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            
            console.log('Chat messages table initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing chat messages table:', error);
            throw error;
        }
    }
}

module.exports = ChatMessage; 