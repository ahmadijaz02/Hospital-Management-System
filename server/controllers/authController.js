const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

const googleClient = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
});

// Helper function to generate token and set cookie
const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    };

    // Update last login
    user.lastLogin = Date.now();
    user.save({ validateBeforeSave: false });

    res
        .status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                profile: user.profile,
                isEmailVerified: user.isEmailVerified
            }
        });
};

// Register user
exports.register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { username, email, password, role, profile } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { email, authProvider: 'local' },
                { username }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.email === email ? 
                    'Email already registered' : 'Username already taken'
            });
        }

        // Create user
        const user = await User.create({
            username,
            email,
            password,
            name: profile?.firstName && profile?.lastName ? `${profile.firstName} ${profile.lastName}` : username,
            role: role || 'patient',
            profile,
            authProvider: 'local'
        });

        // If user is a doctor, create doctor profile
        if (role === 'doctor') {
            const Doctor = require('../models/Doctor');
            const doctor = new Doctor({
                user: user._id,
                specialization: 'General Medicine', // Default value
                qualification: 'MBBS', // Default value
                experience: 0,
                consultationFee: 0,
                isAvailable: true,
                bio: '',
                languages: ['English'],
                schedule: [
                    {
                        day: 'Monday',
                        startTime: '09:00',
                        endTime: '17:00'
                    },
                    {
                        day: 'Tuesday',
                        startTime: '09:00',
                        endTime: '17:00'
                    },
                    {
                        day: 'Wednesday',
                        startTime: '09:00',
                        endTime: '17:00'
                    },
                    {
                        day: 'Thursday',
                        startTime: '09:00',
                        endTime: '17:00'
                    },
                    {
                        day: 'Friday',
                        startTime: '09:00',
                        endTime: '15:00'
                    }
                ]
            });
            await doctor.save();
            console.log('Created doctor profile for new doctor user:', user._id);
        }

        // Generate verification token
        const verificationToken = user.generateVerificationToken();
        await user.save();

        // TODO: Send verification email
        // For now, we'll auto-verify the email
        user.isEmailVerified = true;
        await user.save();

        sendTokenResponse(user, 201, res);
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ 
            email,
            authProvider: 'local'
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        sendTokenResponse(user, 200, res);
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
};

// Google OAuth
exports.googleAuth = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                success: false,
                message: 'No credential provided'
            });
        }

        // Verify Google token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        // Check if user exists
        let user = await User.findOne({
            $or: [
                { googleId },
                { email, authProvider: 'google' }
            ]
        });

        if (!user) {
            // Check if email exists with local auth
            const existingLocalUser = await User.findOne({
                email,
                authProvider: 'local'
            });

            if (existingLocalUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered with password login'
                });
            }

            // Create new user
            const username = email.split('@')[0] + '_' + Math.random().toString(36).slice(-4);
            user = await User.create({
                username,
                email,
                name,
                password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8),
                role: 'patient',
                profile: {
                    firstName: name.split(' ')[0],
                    lastName: name.split(' ').slice(1).join(' '),
                    picture
                },
                googleId,
                authProvider: 'google',
                isEmailVerified: true
            });
        }

        sendTokenResponse(user, 200, res);
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid Google credential',
            error: error.message
        });
    }
};

// Get current logged in user
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get Me Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting user data',
            error: error.message
        });
    }
};

// Logout user
exports.logout = async (req, res) => {
    try {
        res.cookie('token', 'none', {
            expires: new Date(Date.now() + 10 * 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        res.status(200).json({
            success: true,
            message: 'Successfully logged out'
        });
    } catch (error) {
        console.error('Logout Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging out',
            error: error.message
        });
    }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with that email address'
            });
        }

        // Generate reset token
        const resetToken = user.generatePasswordResetToken();
        await user.save({ validateBeforeSave: false });

        // Create reset URL
        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

        const message = `You are receiving this email because you (or someone else) has requested the reset of a password for your account. Please make a request to: \n\n ${resetUrl}\n\nIf you did not request this, please ignore this email.`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset Request',
                message
            });

            res.status(200).json({
                success: true,
                message: 'Password reset instructions have been sent to your email'
            });
        } catch (err) {
            console.error('Send email error:', err);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save({ validateBeforeSave: false });

            return res.status(500).json({
                success: false,
                message: 'Email could not be sent'
            });
        }
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({
            success: false,
            message: 'Error processing forgot password request'
        });
    }
};

// Reset password
exports.resetPassword = async (req, res) => {
    try {
        // Get hashed token
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Set new password
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password has been reset'
        });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({
            success: false,
            message: 'Error resetting password'
        });
    }
}; 