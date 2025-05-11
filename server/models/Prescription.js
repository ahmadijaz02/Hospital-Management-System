const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    dosage: {
        type: String,
        required: true,
        trim: true
    },
    frequency: {
        type: String,
        required: true,
        trim: true
    },
    duration: {
        type: String,
        required: true,
        trim: true
    },
    instructions: {
        type: String,
        trim: true
    }
});

const PrescriptionSchema = new mongoose.Schema({
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
        required: false
    },
    medicalRecord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MedicalRecord',
        required: false
    },
    medications: [MedicationSchema],
    notes: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiryDate: {
        type: Date,
        required: true
    }
});

// Add indexes for faster queries
PrescriptionSchema.index({ patient: 1, createdAt: -1 });
PrescriptionSchema.index({ doctor: 1, createdAt: -1 });
PrescriptionSchema.index({ status: 1 });

module.exports = mongoose.model('Prescription', PrescriptionSchema);
