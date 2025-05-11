const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
    let token;
    console.log('Auth headers:', req.headers.authorization);
    console.log('Cookies:', req.cookies);

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        // Set token from Bearer token in header
        token = req.headers.authorization.split(' ')[1];
        console.log('Token from Authorization header:', token);
    } else if (req.cookies.token) {
        // Set token from cookie
        token = req.cookies.token;
        console.log('Token from cookie:', token);
    }

    // Make sure token exists
    if (!token) {
        console.log('No token found');
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded);

        const user = await User.findById(decoded.id);
        console.log('Found user:', {
            userId: user?._id,
            decodedId: decoded.id,
            userRole: user?.role
        });

        if (!user) {
            console.log('No user found with token ID');
            return res.status(401).json({
                success: false,
                message: 'User no longer exists'
            });
        }

        // Convert user document to a plain object and ensure consistent ID format
        const userObj = user.toObject();
        userObj.id = userObj._id.toString(); // Convert ObjectId to string
        delete userObj._id; // Remove the _id to avoid confusion
        req.user = userObj;
        
        console.log('User object set on request:', {
            id: req.user.id,
            role: req.user.role
        });

        next();
    } catch (err) {
        console.error('Token verification error:', err);
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // Flatten the roles array in case arrays were passed in
        const flatRoles = roles.reduce((acc, role) => {
            return Array.isArray(role) ? [...acc, ...role] : [...acc, role];
        }, []);
        
        console.log('Checking role authorization:', {
            userRole: req.user.role,
            allowedRoles: flatRoles,
            userId: req.user.id
        });

        if (!flatRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
}; 