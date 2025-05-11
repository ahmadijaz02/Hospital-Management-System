const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
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

const app = express();

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: false
}));

// Handle preflight requests
app.options('*', cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
}));

// CORS for all other requests
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Parse JSON for all routes - MUST be before proxy middleware
app.use(express.json());

// Service URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const MAIN_SERVICE_URL = process.env.MAIN_SERVICE_URL || 'http://localhost:5000';
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || 'http://localhost:5001';
const SCHEDULE_SERVICE_URL = process.env.SCHEDULE_SERVICE_URL || 'http://localhost:3004';

// Proxy middleware options
const proxyOptions = {
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        // Forward Authorization header
        if (req.headers.authorization) {
            proxyReq.setHeader('Authorization', req.headers.authorization);
        }
        
        // Log the request
        logger.info(`${req.method} ${req.path} -> ${proxyReq.path}`);
        
        // If there's a body, write it to the proxy request
        if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    },
    onProxyRes: (proxyRes, req, res) => {
        // Add CORS headers to the proxy response
        proxyRes.headers['Access-Control-Allow-Origin'] = process.env.CLIENT_URL || 'http://localhost:3000';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
    },
    onError: (err, req, res) => {
        logger.error('Proxy Error:', err);
        res.status(500).json({
            success: false,
            message: 'Service temporarily unavailable'
        });
    }
};

// Schedule routes
app.use('/api/schedules', createProxyMiddleware({
    ...proxyOptions,
    target: SCHEDULE_SERVICE_URL,
    pathRewrite: {
        '^/api/schedules': '/api/schedules'
    },
    onProxyReq: (proxyReq, req, res) => {
        // Forward Authorization header
        if (req.headers.authorization) {
            const token = req.headers.authorization.split(' ')[1];
            proxyReq.setHeader('Authorization', `Bearer ${token}`);
            proxyReq.setHeader('x-auth-token', token); // Add x-auth-token header
            
            // Log detailed token information
            logger.info(`${req.method} ${req.path} -> ${proxyReq.path}`);
            logger.info(`Token forwarded: ${!!req.headers.authorization}`);
            logger.info(`Token length: ${token.length}`);
            logger.info(`Token starts with: ${token.substring(0, 10)}`);
        } else {
            logger.warn(`No authorization header found for ${req.method} ${req.path}`);
        }
        
        // If there's a body, write it to the proxy request
        if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    }
}));

// Auth routes
app.use('/api/auth', createProxyMiddleware({
    ...proxyOptions,
    target: AUTH_SERVICE_URL,
    pathRewrite: {
        '^/api/auth': '/api/auth'
    }
}));

// Appointment routes
app.use('/api/appointments', createProxyMiddleware({
    ...proxyOptions,
    target: MAIN_SERVICE_URL,
    pathRewrite: {
        '^/api/appointments': '/api/appointments'
    }
}));

// Doctor routes
app.use('/api/doctors', createProxyMiddleware({
    ...proxyOptions,
    target: MAIN_SERVICE_URL,
    pathRewrite: {
        '^/api/doctors': '/api/doctors'
    }
}));

// Other routes pointing to main service
app.use('/api/users', createProxyMiddleware({
    ...proxyOptions,
    target: MAIN_SERVICE_URL,
    pathRewrite: {
        '^/api/users': '/api/users'
    }
}));

app.use('/api/medical-records', createProxyMiddleware({
    ...proxyOptions,
    target: MAIN_SERVICE_URL,
    pathRewrite: {
        '^/api/medical-records': '/api/medical-records'
    }
}));

app.use('/api/prescriptions', createProxyMiddleware({
    ...proxyOptions,
    target: MAIN_SERVICE_URL,
    pathRewrite: {
        '^/api/prescriptions': '/api/prescriptions'
    }
}));

app.use('/api/admin', createProxyMiddleware({
    ...proxyOptions,
    target: MAIN_SERVICE_URL,
    pathRewrite: {
        '^/api/admin': '/api/admin'
    }
}));

// Chat service routes
app.use('/api/chat', createProxyMiddleware({
    ...proxyOptions,
    target: CHAT_SERVICE_URL,
    pathRewrite: {
        '^/api/chat': ''
    }
}));

app.use('/api/users', createProxyMiddleware({ target: MAIN_SERVICE_URL, changeOrigin: true }));
app.use('/api/doctors', createProxyMiddleware({ target: MAIN_SERVICE_URL, changeOrigin: true }));
app.use('/api/appointments', createProxyMiddleware({ target: MAIN_SERVICE_URL, changeOrigin: true }));
app.use('/api/medical-records', createProxyMiddleware({ target: MAIN_SERVICE_URL, changeOrigin: true }));
app.use('/api/prescriptions', createProxyMiddleware({ target: MAIN_SERVICE_URL, changeOrigin: true }));
app.use('/api/admin', createProxyMiddleware({ target: MAIN_SERVICE_URL, changeOrigin: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Start server
const PORT = process.env.API_GATEWAY_PORT || 4000;
app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`);
}); 