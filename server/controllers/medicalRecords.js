const MedicalRecord = require('../models/MedicalRecord');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// @desc    Create a new medical record
// @route   POST /api/medical-records
// @access  Private (Doctors only)
exports.createMedicalRecord = async (req, res) => {
    try {
        const { patient, appointment, diagnosis, symptoms, notes, vitalSigns } = req.body;

        // Verify the appointment exists and belongs to this doctor
        const appointmentExists = await Appointment.findOne({
            _id: appointment,
            doctor: req.user.id,
            patient: patient
        });

        if (!appointmentExists) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or not authorized'
            });
        }

        // Check if a medical record already exists for this appointment
        const existingRecord = await MedicalRecord.findOne({ appointment });
        if (existingRecord) {
            return res.status(400).json({
                success: false,
                message: 'A medical record already exists for this appointment'
            });
        }

        // Create the medical record
        const medicalRecord = await MedicalRecord.create({
            patient,
            doctor: req.user.id,
            appointment,
            diagnosis,
            symptoms,
            notes,
            vitalSigns
        });

        // Update appointment status to completed
        await Appointment.findByIdAndUpdate(appointment, { status: 'completed' });

        res.status(201).json({
            success: true,
            data: medicalRecord
        });
    } catch (error) {
        console.error('Error creating medical record:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Update a medical record
// @route   PUT /api/medical-records/:id
// @access  Private (Doctors only)
exports.updateMedicalRecord = async (req, res) => {
    try {
        const { diagnosis, symptoms, notes, vitalSigns } = req.body;

        // Find the medical record
        let medicalRecord = await MedicalRecord.findById(req.params.id);

        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: 'Medical record not found'
            });
        }

        // Check if the doctor is the owner of this record
        if (medicalRecord.doctor.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update this medical record'
            });
        }

        // Update the medical record
        medicalRecord = await MedicalRecord.findByIdAndUpdate(
            req.params.id,
            {
                diagnosis,
                symptoms,
                notes,
                vitalSigns,
                updatedAt: Date.now()
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: medicalRecord
        });
    } catch (error) {
        console.error('Error updating medical record:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get a specific medical record
// @route   GET /api/medical-records/:id
// @access  Private (Doctors and the patient)
exports.getMedicalRecord = async (req, res) => {
    try {
        const medicalRecord = await MedicalRecord.findById(req.params.id)
            .populate('patient', 'name email')
            .populate('doctor', 'name email')
            .populate('appointment');

        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: 'Medical record not found'
            });
        }

        // Check if the user is authorized (doctor who created or the patient)
        console.log('User ID:', req.user.id);
        console.log('User Role:', req.user.role);
        
        // Allow access if user is a doctor or admin, or if they are the patient
        if (req.user.role === 'doctor' || req.user.role === 'admin') {
            // Doctors and admins can view all medical records
            console.log('Access granted: User is a doctor or admin');
        } else {
            // For patients, check if they are the patient in the record
            const patientId = medicalRecord.patient._id ? medicalRecord.patient._id.toString() : medicalRecord.patient.toString();
            
            if (req.user.id !== patientId) {
                console.log('Access denied: User is not the patient or a doctor/admin');
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized to view this medical record'
                });
            }
            console.log('Access granted: User is the patient');
        }

        res.status(200).json({
            success: true,
            data: medicalRecord
        });
    } catch (error) {
        console.error('Error getting medical record:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get all medical records for a patient
// @route   GET /api/medical-records/patient/:patientId
// @access  Private (Doctors and the patient)
exports.getPatientMedicalRecords = async (req, res) => {
    try {
        const patientId = req.params.patientId || req.user.id;

        // Check if the user is authorized (doctor or the patient themselves)
        if (req.user.role !== 'doctor' && req.user.id !== patientId && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to view these medical records'
            });
        }

        const medicalRecords = await MedicalRecord.find({ patient: patientId })
            .populate('doctor', 'name email')
            .populate('appointment')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: medicalRecords.length,
            data: medicalRecords
        });
    } catch (error) {
        console.error('Error getting patient medical records:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get all medical records created by a doctor
// @route   GET /api/medical-records/doctor/records
// @access  Private (Doctors only)
exports.getDoctorMedicalRecords = async (req, res) => {
    try {
        // Only doctors can access this endpoint
        if (req.user.role !== 'doctor') {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this resource'
            });
        }

        // First, find all patients who have booked appointments with this doctor
        const appointments = await Appointment.find({ doctor: req.user.id })
            .distinct('patient');

        console.log(`Found ${appointments.length} patients with appointments for doctor ${req.user.id}`);

        // Now find all medical records for these patients
        // This includes records created by this doctor and other doctors
        const medicalRecords = await MedicalRecord.find({
            $or: [
                { doctor: req.user.id }, // Records created by this doctor
                { patient: { $in: appointments } } // Records for patients who have appointments with this doctor
            ]
        })
        .populate('patient', 'name email')
        .populate('doctor', 'name email')
        .populate('appointment')
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: medicalRecords.length,
            data: medicalRecords
        });
    } catch (error) {
        console.error('Error getting doctor medical records:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get medical record for a specific appointment
// @route   GET /api/medical-records/appointment/:appointmentId
// @access  Private (Doctors and the patient)
exports.getAppointmentMedicalRecord = async (req, res) => {
    try {
        const appointmentId = req.params.appointmentId;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Check if the user is authorized (doctor or the patient)
        if (
            req.user.id !== appointment.doctor.toString() &&
            req.user.id !== appointment.patient.toString() &&
            req.user.role !== 'admin'
        ) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to view this medical record'
            });
        }

        const medicalRecord = await MedicalRecord.findOne({ appointment: appointmentId })
            .populate('patient', 'name email')
            .populate('doctor', 'name email')
            .populate('appointment');

        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: 'No medical record found for this appointment'
            });
        }

        res.status(200).json({
            success: true,
            data: medicalRecord
        });
    } catch (error) {
        console.error('Error getting appointment medical record:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};
