const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long']
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false // Don't return password by default
    },
    role: {
        type: String,
        enum: ['admin', 'doctor', 'patient'],
        default: 'patient'
    },
    phone: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    dateOfBirth: {
        type: String,
        trim: true
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        trim: true
    },
    bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        trim: true
    },
    height: {
        type: String,
        trim: true
    },
    weight: {
        type: String,
        trim: true
    },
    medicalHistory: {
        type: String,
        trim: true
    },
    allergies: {
        type: String,
        trim: true
    },
    emergencyContact: {
        name: {
            type: String,
            trim: true
        },
        relationship: {
            type: String,
            trim: true
        },
        phone: {
            type: String,
            trim: true
        }
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationTokenExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            lat: {
                type: Number,
                required: false
            },
            lng: {
                type: Number,
                required: false
            },
            name: {
                type: String,
                required: false
            }
        },
        required: false
    }
}, {
    timestamps: true
});

// Create indexes
userSchema.index({ email: 1, authProvider: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
    // Only hash the password if it's been modified or is new
    if (!this.isModified('password')) return next();
    
    try {
        // Generate salt
        const salt = await bcrypt.genSalt(10);
        // Hash password
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Error comparing passwords');
    }
};

// Generate verification token
userSchema.methods.generateVerificationToken = function() {
    const verificationToken = jwt.sign(
        { id: this._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    this.verificationToken = verificationToken;
    this.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    return verificationToken;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
};

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
    return jwt.sign(
        { 
            id: this._id,
            role: this.role,
            email: this.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRE
        }
    );
};

// Get full name
userSchema.methods.getFullName = function() {
    return `${this.profile.firstName || ''} ${this.profile.lastName || ''}`.trim() || this.username;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 