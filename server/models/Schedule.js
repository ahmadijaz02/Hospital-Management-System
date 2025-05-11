const mongoose = require('mongoose');

const TimeSlotSchema = new mongoose.Schema({
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

const DayScheduleSchema = new mongoose.Schema({
    day: {
        type: String,
        required: true,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    isWorkingDay: {
        type: Boolean,
        default: true
    },
    timeSlots: [TimeSlotSchema]
});

const ScheduleSchema = new mongoose.Schema({
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    weeklySchedule: [DayScheduleSchema],
    defaultSlotDuration: {
        type: Number,
        default: 30, // Duration in minutes
        required: true
    },
    breakTime: {
        start: String,
        end: String
    },
    maxPatientsPerSlot: {
        type: Number,
        default: 1
    },
    effectiveFrom: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Create index for faster queries
ScheduleSchema.index({ doctor: 1, 'weeklySchedule.day': 1 });

module.exports = mongoose.model('Schedule', ScheduleSchema); 