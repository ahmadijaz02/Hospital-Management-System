const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
});

const doctorSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    specialization: {
        type: String,
        required: [true, 'Please add a specialization'],
        trim: true
    },
    qualification: {
        type: String,
        required: [true, 'Please add qualifications'],
        trim: true
    },
    experience: {
        type: Number,
        required: [true, 'Please add years of experience']
    },
    schedule: [{
        day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            required: true
        },
        slots: [timeSlotSchema]
    }],
    isAvailable: {
        type: Boolean,
        default: true
    },
    consultationFee: {
        type: Number,
        required: [true, 'Please add consultation fee']
    },
    bio: {
        type: String,
        trim: true
    },
    languages: [{
        type: String,
        trim: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add index for faster queries
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ isAvailable: 1 });

module.exports = mongoose.model('Doctor', doctorSchema); 