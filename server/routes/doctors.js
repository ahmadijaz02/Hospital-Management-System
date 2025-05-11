const express = require('express');
const { check, validationResult } = require('express-validator');
const {
    createDoctor,
    getDoctors,
    getDoctor,
    updateDoctor,
    deleteDoctor,
    updateSchedule,
    getDoctorDashboardStats
} = require('../controllers/doctors');
const { protect, authorize } = require('../middleware/auth');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/doctors/dashboard-stats
// @desc    Get doctor dashboard statistics
// @access  Private (Doctor only)
router.get('/dashboard-stats', protect, authorize('doctor'), getDoctorDashboardStats);

// Create new doctor
router.post(
    '/',
    [
        protect,
        authorize('admin'),
        [
            check('name', 'Name is required').not().isEmpty(),
            check('email', 'Please include a valid email').isEmail(),
            check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
            check('specialization', 'Specialization is required').not().isEmpty(),
            check('qualification', 'Qualification is required').not().isEmpty(),
            check('experience', 'Experience is required').isNumeric(),
            check('consultationFee', 'Consultation fee is required').isNumeric()
        ]
    ],
    createDoctor
);

// Get all doctors
router.get('/', getDoctors);

// Update schedule
router.put(
    '/:id/schedule',
    [
        protect,
        authorize('doctor'),
        [
            check('schedule', 'Schedule is required').isArray(),
            check('schedule.*.day', 'Day is required').not().isEmpty(),
            check('schedule.*.startTime', 'Start time is required').not().isEmpty(),
            check('schedule.*.endTime', 'End time is required').not().isEmpty()
        ]
    ],
    updateSchedule
);

// Get single doctor
router.get('/:id', getDoctor);

// Update doctor
router.put(
    '/:id',
    [
        protect,
        authorize('admin', 'doctor'),
        [
            check('specialization', 'Specialization is required').not().isEmpty(),
            check('qualification', 'Qualification is required').not().isEmpty(),
            check('experience', 'Experience is required').isNumeric(),
            check('consultationFee', 'Consultation fee is required').isNumeric()
        ]
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            // Get the doctor record by user ID
            let doctor = await Doctor.findOne({ user: req.params.id });

            console.log('Finding doctor with user ID:', {
                searchId: req.params.id,
                doctorFound: !!doctor,
                requestUser: req.user
            });

            const {
                specialization,
                qualification,
                experience,
                consultationFee,
                isAvailable,
                bio,
                languages
            } = req.body;

            if (!doctor) {
                // Create new doctor record if it doesn't exist
                if (req.user.role === 'doctor' && req.user.id === req.params.id) {
                    doctor = new Doctor({
                        user: req.params.id,
                        specialization,
                        qualification,
                        experience,
                        consultationFee,
                        isAvailable: isAvailable || true,
                        bio: bio || '',
                        languages: languages || []
                    });
                    await doctor.save();
                    
                    return res.status(201).json({
                        success: true,
                        data: doctor,
                        message: 'Doctor profile created successfully'
                    });
                } else {
                    return res.status(404).json({
                        success: false,
                        message: 'Doctor not found'
                    });
                }
            }

            // Check if the user is authorized (admin or the doctor themselves)
            if (req.user.role !== 'admin' && doctor.user.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            // Update existing doctor profile
            doctor = await Doctor.findOneAndUpdate(
                { user: req.params.id },
                {
                    specialization,
                    qualification,
                    experience,
                    consultationFee,
                    isAvailable,
                    bio,
                    languages
                },
                {
                    new: true,
                    runValidators: true
                }
            );

            res.status(200).json({
                success: true,
                data: doctor
            });
        } catch (err) {
            console.error('Update doctor error:', err);
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: err.message
            });
        }
    }
);

// Delete doctor
router.delete('/:id', [protect, authorize('admin')], deleteDoctor);

module.exports = router; 