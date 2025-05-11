const Prescription = require('../models/Prescription');
const MedicalRecord = require('../models/MedicalRecord');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// @desc    Create a new prescription
// @route   POST /api/prescriptions
// @access  Private (Doctors only)
exports.createPrescription = async (req, res) => {
    try {
        const { patient, appointment, medicalRecord, medications, notes, expiryDate } = req.body;

        // Verify the patient exists
        const patientExists = await User.findOne({
            _id: patient,
            role: 'patient'
        });

        if (!patientExists) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // If appointment is provided, verify it exists and belongs to this doctor
        if (appointment) {
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
        }

        // If medical record is provided, verify it exists and belongs to this doctor
        if (medicalRecord) {
            const medicalRecordExists = await MedicalRecord.findOne({
                _id: medicalRecord,
                doctor: req.user.id,
                patient: patient
            });

            if (!medicalRecordExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Medical record not found or not authorized'
                });
            }
        }

        // Create the prescription
        const prescription = await Prescription.create({
            patient,
            doctor: req.user.id,
            appointment,
            medicalRecord,
            medications,
            notes,
            expiryDate
        });

        res.status(201).json({
            success: true,
            data: prescription
        });
    } catch (error) {
        console.error('Error creating prescription:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Update a prescription
// @route   PUT /api/prescriptions/:id
// @access  Private (Doctors only)
exports.updatePrescription = async (req, res) => {
    try {
        const { medications, notes, status, expiryDate } = req.body;

        // Find the prescription
        let prescription = await Prescription.findById(req.params.id);

        if (!prescription) {
            return res.status(404).json({
                success: false,
                message: 'Prescription not found'
            });
        }

        // Check if the doctor is the owner of this prescription
        if (prescription.doctor.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update this prescription'
            });
        }

        // Update the prescription
        prescription = await Prescription.findByIdAndUpdate(
            req.params.id,
            {
                medications,
                notes,
                status,
                expiryDate
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: prescription
        });
    } catch (error) {
        console.error('Error updating prescription:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get a specific prescription
// @route   GET /api/prescriptions/:id
// @access  Private (Doctors and the patient)
exports.getPrescription = async (req, res) => {
    try {
        const prescription = await Prescription.findById(req.params.id)
            .populate('patient', 'name email')
            .populate('doctor', 'name email')
            .populate('appointment')
            .populate('medicalRecord');

        if (!prescription) {
            return res.status(404).json({
                success: false,
                message: 'Prescription not found'
            });
        }

        // Check if the user is authorized (doctor who created or the patient)
        console.log('User ID:', req.user.id);
        console.log('User Role:', req.user.role);

        // Allow access if user is a doctor or admin, or if they are the patient
        if (req.user.role === 'doctor' || req.user.role === 'admin') {
            // Doctors and admins can view all prescriptions
            console.log('Access granted: User is a doctor or admin');
        } else {
            // For patients, check if they are the patient in the prescription
            const patientId = prescription.patient._id ? prescription.patient._id.toString() : prescription.patient.toString();

            if (req.user.id !== patientId) {
                console.log('Access denied: User is not the patient or a doctor/admin');
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized to view this prescription'
                });
            }
            console.log('Access granted: User is the patient');
        }

        res.status(200).json({
            success: true,
            data: prescription
        });
    } catch (error) {
        console.error('Error getting prescription:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get all prescriptions for a patient
// @route   GET /api/prescriptions/patient/:patientId
// @access  Private (Doctors and the patient)
exports.getPatientPrescriptions = async (req, res) => {
    try {
        const patientId = req.params.patientId || req.user.id;

        // Check if the user is authorized (doctor or the patient themselves)
        if (req.user.role !== 'doctor' && req.user.id !== patientId && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to view these prescriptions'
            });
        }

        const prescriptions = await Prescription.find({ patient: patientId })
            .populate('doctor', 'name email')
            .populate('appointment')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: prescriptions.length,
            data: prescriptions
        });
    } catch (error) {
        console.error('Error getting patient prescriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get all prescriptions created by a doctor
// @route   GET /api/prescriptions/doctor
// @access  Private (Doctors only)
exports.getDoctorPrescriptions = async (req, res) => {
    try {
        // Only doctors can access this endpoint
        if (req.user.role !== 'doctor') {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this resource'
            });
        }

        console.log('Fetching prescriptions for doctor:', req.user.id);

        // Find all prescriptions for this doctor
        let prescriptions = await Prescription.find({ doctor: req.user.id })
            .populate('patient', 'name email')
            .populate('appointment')
            .sort({ createdAt: -1 });

        console.log(`Found ${prescriptions.length} prescriptions`);

        // Check for any prescriptions with missing patient data
        const prescriptionsWithMissingPatient = prescriptions.filter(p => !p.patient);

        if (prescriptionsWithMissingPatient.length > 0) {
            console.warn(`Found ${prescriptionsWithMissingPatient.length} prescriptions with missing patient data`);

            // Try to fix prescriptions with missing patient data
            for (const prescription of prescriptionsWithMissingPatient) {
                try {
                    // Try to find the patient directly
                    const patientId = prescription.patient ? prescription.patient.toString() : null;

                    if (patientId) {
                        console.log(`Attempting to fix prescription ${prescription._id} by fetching patient ${patientId}`);
                        const patient = await User.findById(patientId).select('name email');

                        if (patient) {
                            console.log(`Found patient ${patient.name} for prescription ${prescription._id}`);
                            prescription.patient = patient;
                        } else {
                            console.warn(`Could not find patient ${patientId} for prescription ${prescription._id}`);
                        }
                    } else {
                        console.warn(`Prescription ${prescription._id} has no patient ID`);
                    }
                } catch (err) {
                    console.error(`Error fixing patient data for prescription ${prescription._id}:`, err);
                }
            }
        }

        res.status(200).json({
            success: true,
            count: prescriptions.length,
            data: prescriptions
        });
    } catch (error) {
        console.error('Error getting doctor prescriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get active prescriptions for a patient
// @route   GET /api/prescriptions/patient/:patientId/active
// @access  Private (Doctors and the patient)
exports.getActivePatientPrescriptions = async (req, res) => {
    try {
        const patientId = req.params.patientId || req.user.id;

        // Check if the user is authorized (doctor or the patient themselves)
        if (req.user.role !== 'doctor' && req.user.id !== patientId && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to view these prescriptions'
            });
        }

        const prescriptions = await Prescription.find({
            patient: patientId,
            status: 'active',
            expiryDate: { $gte: new Date() }
        })
            .populate('doctor', 'name email')
            .populate('appointment')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: prescriptions.length,
            data: prescriptions
        });
    } catch (error) {
        console.error('Error getting active patient prescriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Download a prescription (generate PDF data)
// @route   GET /api/prescriptions/:id/download
// @access  Private (Doctors and the patient)
exports.downloadPrescription = async (req, res) => {
    try {
        const prescription = await Prescription.findById(req.params.id)
            .populate('patient', 'name email phone address dateOfBirth gender')
            .populate('doctor', 'name email');

        // Log the prescription for debugging
        console.log('Prescription found:', {
            id: prescription._id,
            patient: prescription.patient,
            doctor: prescription.doctor
        });

        if (!prescription) {
            return res.status(404).json({
                success: false,
                message: 'Prescription not found'
            });
        }

        // Check if the user is authorized (doctor who created or the patient)
        console.log('User ID:', req.user.id);
        console.log('User Role:', req.user.role);

        // Allow access if user is a doctor or admin, or if they are the patient
        if (req.user.role === 'doctor' || req.user.role === 'admin') {
            // Doctors and admins can download all prescriptions
            console.log('Access granted: User is a doctor or admin');
        } else {
            // For patients, check if they are the patient in the prescription
            const patientId = prescription.patient._id ? prescription.patient._id.toString() : prescription.patient.toString();

            if (req.user.id !== patientId) {
                console.log('Access denied: User is not the patient or a doctor/admin');
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized to download this prescription'
                });
            }
            console.log('Access granted: User is the patient');
        }

        // Return prescription data for PDF generation on the client side
        res.status(200).json({
            success: true,
            data: prescription
        });
    } catch (error) {
        console.error('Error downloading prescription:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};
