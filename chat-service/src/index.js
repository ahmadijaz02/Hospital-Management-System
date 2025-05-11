const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const chatRoutes = require('./routes/chat');
const pool = require('./config/database');
require('dotenv').config();

// Initialize logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Initialize express app
const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = socketIo(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// Test MySQL connection
const connectDB = async () => {
    try {
        const connection = await pool.getConnection();
        connection.release();
        logger.info('MySQL connection has been established successfully.');
    } catch (error) {
        logger.error('Unable to connect to the MySQL database:', error);
        // Retry connection after 5 seconds
        setTimeout(connectDB, 5000);
    }
};

// Initialize database connection
connectDB();

// Use chat routes
app.use('/', chatRoutes);

// Socket.IO middleware for authentication
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
    }
});

// Socket.IO connection handling
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Handle user joining
    socket.on('join', (userData) => {
        try {
            // Remove existing connection for this user if any
            for (const [userId, userSocket] of onlineUsers.entries()) {
                if (userId === userData.id) {
                    userSocket.disconnect();
                    onlineUsers.delete(userId);
                }
            }

            // Add new connection
            onlineUsers.set(userData.id, socket);
            socket.userData = userData;

            // Broadcast updated online users list
            io.emit('onlineUsers', Array.from(onlineUsers.values()).map(socket => socket.userData));

            console.log(`User ${userData.id} joined the chat`);
        } catch (error) {
            console.error('Error in join event:', error);
            socket.emit('error', { message: 'Error joining chat' });
        }
    });

    // Handle messages
    socket.on('sendMessage', async (messageData) => {
        try {
            const ChatMessage = require('./models/ChatMessage');

            // Create message using our MySQL-based model
            const message = await ChatMessage.create({
                sender: socket.userData.id,
                senderName: socket.userData.name,
                senderType: socket.userData.type,
                content: messageData.content,
                timestamp: new Date()
            });

            // The message is already a plain object from our model
            console.log('Message saved:', message);
            io.emit('message', message);
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', { message: 'Error sending message' });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        if (socket.userData) {
            onlineUsers.delete(socket.userData.id);
            io.emit('onlineUsers', Array.from(onlineUsers.values()).map(socket => socket.userData));
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Initialize database and start server
const ChatMessage = require('./models/ChatMessage');

// Initialize database table before starting server
async function initializeAndStartServer() {
    const maxRetries = 10;
    const retryDelay = 5000; // 5 seconds
    let retries = 0;

    const tryInitialize = async () => {
        try {
            // Initialize chat messages table
            await ChatMessage.initTable();
            logger.info('Chat messages table initialized successfully');

            // Start server
            const PORT = process.env.CHAT_SERVICE_PORT || 5001;
            server.listen(PORT, () => {
                logger.info(`Chat service running on port ${PORT}`);
            });
            return true;
        } catch (error) {
            retries++;
            logger.error(`Failed to initialize database (attempt ${retries}/${maxRetries}):`, error);

            if (retries >= maxRetries) {
                logger.error('Max initialization attempts reached. Exiting.');
                process.exit(1);
            }

            logger.info(`Retrying in ${retryDelay/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return tryInitialize();
        }
    };

    return tryInitialize();
}

// Handle process termination gracefully
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

// Start the server with retry logic
initializeAndStartServer();