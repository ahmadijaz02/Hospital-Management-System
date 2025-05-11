const mongoose = require('mongoose');

const MedicalRecordSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true
    },
    diagnosis: {
        type: String,
        required: true,
        trim: true
    },
    symptoms: {
        type: String,
        required: true,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    },
    vitalSigns: {
        temperature: {
            type: String,
            trim: true
        },
        bloodPressure: {
            type: String,
            trim: true
        },
        heartRate: {
            type: String,
            trim: true
        },
        respiratoryRate: {
            type: String,
            trim: true
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Add indexes for faster queries
MedicalRecordSchema.index({ patient: 1, createdAt: -1 });
MedicalRecordSchema.index({ doctor: 1, createdAt: -1 });
MedicalRecordSchema.index({ appointment: 1 }, { unique: true });

module.exports = mongoose.model('MedicalRecord', MedicalRecordSchema);
