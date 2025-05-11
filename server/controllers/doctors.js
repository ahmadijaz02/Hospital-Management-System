const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');

// @desc    Create a doctor
// @route   POST /api/doctors
// @access  Private/Admin
exports.createDoctor = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            name,
            email,
            password,
            specialization,
            qualification,
            experience,
            schedule,
            consultationFee
        } = req.body;

        // Create user first
        const user = await User.create({
            name,
            email,
            password,
            role: 'doctor'
        });

        // Create doctor profile
        const doctor = await Doctor.create({
            user: user._id,
            specialization,
            qualification,
            experience,
            schedule,
            consultationFee
        });

        res.status(201).json({
            success: true,
            data: doctor
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Public
exports.getDoctors = async (req, res) => {
    try {
        console.log('Getting all doctors');
        
        // First, get all users with role 'doctor'
        const doctorUsers = await User.find({ role: 'doctor', isActive: true });
        console.log('Found doctor users:', doctorUsers.length);

        // Get existing doctor profiles
        let doctors = await Doctor.find()
            .populate('user', 'name email')
            .select('-__v');
        
        console.log('Found doctor profiles:', doctors.length);

        // Create doctor profiles for users that don't have one
        for (const user of doctorUsers) {
            const hasProfile = doctors.some(doc => doc.user._id.toString() === user._id.toString());
            
            if (!hasProfile) {
                console.log('Creating doctor profile for user:', user._id);
                const newDoctor = new Doctor({
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

                await newDoctor.save();
                await newDoctor.populate('user', 'name email');
                doctors.push(newDoctor);
            }
        }

        console.log('Total doctors after processing:', doctors.length);

        res.status(200).json({
            success: true,
            count: doctors.length,
            data: doctors
        });
    } catch (err) {
        console.error('Get doctors error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};

// @desc    Get single doctor
// @route   GET /api/doctors/:id
// @access  Public
exports.getDoctor = async (req, res) => {
    try {
        console.log('Getting doctor with user ID:', req.params.id);
        
        let doctor = await Doctor.findOne({ user: req.params.id })
            .populate('user', 'name email phone address')
            .select('-__v');

        console.log('Doctor search result:', doctor);
        console.log('Request user:', req.user);

        // If doctor doesn't exist and the request is from a doctor user, create a new doctor record
        if (!doctor && req.user?.role === 'doctor' && req.user?.id === req.params.id) {
            console.log('Creating new doctor record for user:', req.params.id);
            
            doctor = new Doctor({
                user: req.params.id,
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
            // Populate user data after saving
            doctor = await doctor.populate('user', 'name email phone address');
            console.log('New doctor record created:', doctor);
        }

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        res.status(200).json({
            success: true,
            data: doctor
        });
    } catch (err) {
        console.error('Get doctor error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};

// @desc    Update doctor
// @route   PUT /api/doctors/:id
// @access  Private/Admin
exports.updateDoctor = async (req, res) => {
    try {
        console.log('Updating doctor profile:', {
            userId: req.params.id,
            body: req.body
        });

        const {
            specialization,
            qualification,
            experience,
            schedule,
            isAvailable,
            consultationFee,
            bio,
            languages
        } = req.body;

        // Find doctor by user ID
        let doctor = await Doctor.findOne({ user: req.params.id });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        // Update doctor profile
        doctor = await Doctor.findOneAndUpdate(
            { user: req.params.id },
            {
                specialization,
                qualification,
                experience,
                schedule,
                isAvailable,
                consultationFee,
                bio,
                languages
            },
            {
                new: true,
                runValidators: true
            }
        );

        // Populate the user data
        await doctor.populate('user', 'name email phone address');

        console.log('Updated doctor with populated user:', doctor);

        res.status(200).json({
            success: true,
            data: {
                ...doctor.toObject(),
                user: doctor.user
            }
        });
    } catch (err) {
        console.error('Update doctor error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};

// @desc    Delete doctor
// @route   DELETE /api/doctors/:id
// @access  Private/Admin
exports.deleteDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        // Delete associated user
        await User.findByIdAndDelete(doctor.user);

        // Delete doctor
        await doctor.remove();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Update doctor schedule
// @route   PUT /api/doctors/:id/schedule
// @access  Private/Doctor
exports.updateSchedule = async (req, res) => {
    try {
        const { weeklySchedule } = req.body;
        console.log('Received schedule update:', weeklySchedule);

        let doctor = await Doctor.findOne({ user: req.params.id });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        // Check if the logged in user is the doctor
        if (doctor.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update this doctor'
            });
        }

        // Process weekly schedule
        const processedSchedule = weeklySchedule.map(daySchedule => {
            // If it's not a working day, return empty slots
            if (!daySchedule.isWorkingDay) {
                return {
                    day: daySchedule.day,
                    slots: []
                };
            }

            // Filter only the selected time slots
            const selectedSlots = (daySchedule.timeSlots || [])
                .filter(slot => slot.isSelected || slot.isAvailable === true)
                .map(slot => ({
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isAvailable: true
                }));

            return {
                day: daySchedule.day,
                slots: selectedSlots
            };
        });

        // Update the doctor's schedule
        doctor = await Doctor.findOneAndUpdate(
            { user: req.params.id },
            { schedule: processedSchedule },
            {
                new: true,
                runValidators: true
            }
        );

        console.log('Updated schedule:', doctor.schedule);

        res.status(200).json({
            success: true,
            data: doctor
        });
    } catch (err) {
        console.error('Update schedule error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};

// @desc    Get doctor dashboard statistics
// @route   GET /api/doctors/dashboard-stats
// @access  Private/Doctor
exports.getDoctorDashboardStats = async (req, res) => {
    try {
        console.log('Getting dashboard stats for doctor:', req.user.id);
        
        // First, ensure doctor profile exists
        let doctor = await Doctor.findOne({ user: req.user.id })
            .populate('user', 'name email phone address');

        // If doctor profile doesn't exist, create it with default values
        if (!doctor && req.user?.role === 'doctor') {
            console.log('Creating new doctor record for dashboard stats:', req.user.id);
            
            doctor = new Doctor({
                user: req.user.id,
                specialization: 'General Medicine', // Default value
                qualification: 'MBBS', // Default value
                experience: 0,
                consultationFee: 0,
                isAvailable: true,
                bio: '',
                languages: ['English'],
                schedule: [
                    { day: 'Monday', slots: [] },
                    { day: 'Tuesday', slots: [] },
                    { day: 'Wednesday', slots: [] },
                    { day: 'Thursday', slots: [] },
                    { day: 'Friday', slots: [] }
                ]
            });

            await doctor.save();
            doctor = await doctor.populate('user', 'name email phone address');
            console.log('New doctor record created for dashboard:', doctor);
        }

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        // Get appointment statistics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // Get today's appointments
        const todayAppointments = await Appointment.find({
            doctor: doctor._id,
            date: {
                $gte: today,
                $lte: endOfDay
            }
        }).populate('patient', 'name').exec();

        // Get total patients (unique patients who have had appointments with this doctor)
        const totalPatients = await Appointment.distinct('patient', {
            doctor: doctor._id
        });

        // Get this week's appointments
        const weekAppointments = await Appointment.find({
            doctor: doctor._id,
            date: {
                $gte: startOfWeek,
                $lte: endOfWeek
            }
        }).exec();

        // Get available slots (assuming 8 slots per day and subtracting booked appointments)
        const bookedSlots = todayAppointments.length;
        const totalSlotsPerDay = 8; // This should match your business logic
        const availableSlots = Math.max(0, totalSlotsPerDay - bookedSlots);

        res.status(200).json({
            success: true,
            data: {
                doctor,
                todayAppointments: todayAppointments.map(apt => ({
                    id: apt._id.toString(),
                    patient: apt.patient.name,
                    time: apt.time,
                    type: apt.type || 'Check-up',
                    status: apt.status || 'Scheduled'
                })),
                stats: {
                    todayAppointments: todayAppointments.length,
                    totalPatients: totalPatients.length,
                    weeklyAppointments: weekAppointments.length,
                    availableSlots
                }
            }
        });
    } catch (err) {
        console.error('Get doctor dashboard stats error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
}; 