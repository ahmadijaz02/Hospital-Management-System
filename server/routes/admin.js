const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const Schedule = require('../models/Schedule');
const { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } = require('date-fns');
const MedicalRecord = require('../models/MedicalRecord');

const router = express.Router();

// Protect all routes
router.use(protect);
router.use(authorize('admin'));

// Get admin dashboard stats
router.get('/stats', async (req, res) => {
    try {
        console.log('Fetching admin stats...');

        // Get total users count
        const totalUsers = await User.countDocuments() || 0;
        console.log('Total users:', totalUsers);

        // Get active doctors count
        const activeDoctors = await User.countDocuments({
            role: 'doctor',
            isActive: true
        }) || 0;
        console.log('Active doctors:', activeDoctors);

        // Get active patients count
        const activePatients = await User.countDocuments({
            role: 'patient',
            isActive: true
        }) || 0;
        console.log('Active patients:', activePatients);

        // Get today's appointments
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todaysAppointments = await Appointment.countDocuments({
            date: {
                $gte: today,
                $lt: tomorrow
            }
        }) || 0;
        console.log('Today\'s appointments:', todaysAppointments);

        // Get appointment statistics for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const appointments = await Appointment.find({
            date: { $gte: thirtyDaysAgo }
        }) || [];
        console.log('Found appointments for last 30 days:', appointments.length);

        const totalAppointments = appointments.length;
        const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
        const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled').length;
        const pendingAppointments = appointments.filter(apt => apt.status === 'scheduled').length;

        const appointmentStats = {
            completedPercentage: totalAppointments ? Math.round((completedAppointments / totalAppointments) * 100) : 0,
            cancelledPercentage: totalAppointments ? Math.round((cancelledAppointments / totalAppointments) * 100) : 0,
            pendingPercentage: totalAppointments ? Math.round((pendingAppointments / totalAppointments) * 100) : 0
        };
        console.log('Appointment stats:', appointmentStats);

        // Get department statistics
        const doctors = await Doctor.find().populate('user', 'name') || [];
        console.log('Found doctors:', doctors.length);

        const departmentStats = [];
        const departmentAppointments = {};
        const departmentDoctors = {};

        // Count doctors and appointments per department
        for (const doctor of doctors) {
            if (!doctor.specialization) continue; // Skip if no specialization

            const dept = doctor.specialization || 'General';
            departmentDoctors[dept] = (departmentDoctors[dept] || 0) + 1;

            const deptAppointments = await Appointment.countDocuments({
                doctor: doctor.user?._id,
                date: { $gte: thirtyDaysAgo }
            }) || 0;
            departmentAppointments[dept] = (departmentAppointments[dept] || 0) + deptAppointments;
        }

        // Calculate percentages and create stats
        const totalDeptAppointments = Object.values(departmentAppointments).reduce((a, b) => a + b, 0);
        for (const dept in departmentDoctors) {
            departmentStats.push({
                name: dept || 'General',
                doctorCount: departmentDoctors[dept],
                appointmentPercentage: totalDeptAppointments ?
                    Math.round((departmentAppointments[dept] / totalDeptAppointments) * 100) : 0
            });
        }

        // If no departments found, add a default one
        if (departmentStats.length === 0) {
            departmentStats.push({
                name: 'General',
                doctorCount: 0,
                appointmentPercentage: 0
            });
        }
        console.log('Department stats:', departmentStats);

        // Get top performing doctors
        const doctorPerformance = await Promise.all(doctors.map(async (doctor) => {
            if (!doctor.user?._id) return null; // Skip if no user reference

            const doctorAppointments = await Appointment.find({
                doctor: doctor.user._id,
                date: { $gte: thirtyDaysAgo }
            }) || [];

            const completed = doctorAppointments.filter(apt => apt.status === 'completed').length;
            const total = doctorAppointments.length;

            return {
                name: doctor.user.name || 'Unknown Doctor',
                completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
                totalAppointments: total
            };
        }));

        const topDoctors = doctorPerformance
            .filter(Boolean) // Remove null entries
            .sort((a, b) => b.completionRate - a.completionRate)
            .slice(0, 5);

        // If no doctors found, add a default entry
        if (topDoctors.length === 0) {
            topDoctors.push({
                name: 'No doctors available',
                completionRate: 0,
                totalAppointments: 0
            });
        }
        console.log('Top doctors:', topDoctors);

        // Get patient statistics
        const newPatientsThisMonth = await User.countDocuments({
            role: 'patient',
            createdAt: { $gte: new Date(today.getFullYear(), today.getMonth(), 1) }
        }) || 0;

        // Calculate return rate (patients with multiple appointments)
        const patientAppointments = await Appointment.aggregate([
            {
                $match: {
                    date: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: '$patient',
                    appointmentCount: { $sum: 1 }
                }
            },
            {
                $match: {
                    appointmentCount: { $gt: 1 }
                }
            }
        ]) || [];

        const totalPatients = await Appointment.distinct('patient', {
            date: { $gte: thirtyDaysAgo }
        }) || [];

        const returnRate = totalPatients.length > 0 ?
            Math.round((patientAppointments.length / totalPatients.length) * 100) : 0;

        const patientStats = {
            newThisMonth: newPatientsThisMonth,
            returnRate
        };
        console.log('Patient stats:', patientStats);

        const responseData = {
            success: true,
            data: {
                totalUsers,
                activeDoctors,
                activePatients,
                todaysAppointments,
                appointmentStats,
                departmentStats,
                topDoctors,
                patientStats
            }
        };
        console.log('Sending response:', responseData);

        res.json(responseData);
    } catch (error) {
        console.error('Admin stats error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({
            success: false,
            message: 'Error fetching admin stats',
            error: error.message
        });
    }
});

// Get all appointments
router.get('/appointments', async (req, res) => {
    try {
        const appointments = await Appointment.find()
            .populate('doctor', 'name email specialization')
            .populate('patient', 'name email')
            .sort({ date: -1, time: -1 });

        res.json({
            success: true,
            data: appointments
        });
    } catch (error) {
        console.error('Get all appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching appointments'
        });
    }
});

// Delete appointment
router.delete('/appointments/:id', async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        await Appointment.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Appointment deleted successfully'
        });
    } catch (error) {
        console.error('Delete appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting appointment'
        });
    }
});

// Get all doctors
router.get('/doctors', async (req, res) => {
    try {
        // Get all users with role 'doctor'
        const doctorUsers = await User.find({ role: 'doctor' })
            .select('name email isActive');

        // Get doctor-specific data
        const doctorIds = doctorUsers.map(user => user._id);
        const doctorDetails = await Doctor.find({ user: { $in: doctorIds } });

        // Combine user and doctor data
        const doctors = doctorUsers.map(user => {
            const doctorDetail = doctorDetails.find(
                detail => detail.user.toString() === user._id.toString()
            );
            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                isActive: user.isActive,
                specialization: doctorDetail?.specialization || '',
                experience: doctorDetail?.experience || 0,
                qualification: doctorDetail?.qualification || '',
                consultationFee: doctorDetail?.consultationFee || 0
            };
        });

        res.json({
            success: true,
            data: doctors
        });
    } catch (error) {
        console.error('Get all doctors error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching doctors'
        });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
});

// Get single user
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user'
        });
    }
});

// Update user
router.put('/users/:id', async (req, res) => {
    try {
        const { name, email, role, phone, isActive } = req.body;

        // Build user object
        const userFields = {};
        if (name) userFields.name = name;
        if (email) userFields.email = email;
        if (role) userFields.role = role;
        if (phone) userFields.phone = phone;
        if (isActive !== undefined) userFields.isActive = isActive;

        let user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Don't allow updating the last admin
        if (user.role === 'admin' && role !== 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot change role of the last admin'
                });
            }
        }

        user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: userFields },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user'
        });
    }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Don't allow deleting the last admin
        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete the last admin'
                });
            }
        }

        // If the user is a doctor, delete associated data
        if (user.role === 'doctor') {
            // Delete doctor's schedule
            await Schedule.deleteMany({ doctor: user._id });

            // Delete doctor's appointments
            await Appointment.deleteMany({ doctor: user._id });

            // Delete doctor's profile from Doctor collection
            await Doctor.findOneAndDelete({ user: user._id });

            // Delete medical records created by this doctor
            await MedicalRecord.deleteMany({ doctor: user._id });

            console.log(`Deleted associated data for doctor: ${user._id}`);
        }

        // If the user is a patient, delete their data
        if (user.role === 'patient') {
            // Delete patient's appointments
            await Appointment.deleteMany({ patient: user._id });

            // Delete patient's medical records
            await MedicalRecord.deleteMany({ patient: user._id });

            console.log(`Deleted associated data for patient: ${user._id}`);
        }

        // Finally delete the user
        await User.findByIdAndDelete(user._id);

        res.json({
            success: true,
            message: 'User and associated data deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user'
        });
    }
});

// Create new user
router.post('/users', [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('role', 'Role is required').isIn(['admin', 'doctor', 'patient'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { name, email, password, role, phone } = req.body;

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Create user
        user = new User({
            name,
            email,
            password,
            role,
            phone
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        res.status(201).json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating user'
        });
    }
});

// Get all doctor schedules
router.get('/doctor-schedules', async (req, res) => {
    try {
        const schedules = await Schedule.find()
            .populate({
                path: 'doctor',
                select: 'name email specialization',
                model: 'User'
            })
            .sort({ 'doctor.name': 1 });

        res.json({
            success: true,
            data: schedules
        });
    } catch (error) {
        console.error('Get doctor schedules error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching doctor schedules'
        });
    }
});

// Get all patients
router.get('/patients', async (req, res) => {
    try {
        const patients = await User.find({ role: 'patient' })
            .select('name email phone dateOfBirth gender bloodGroup isActive')
            .sort('name');

        res.json({
            success: true,
            data: patients
        });
    } catch (error) {
        console.error('Get all patients error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching patients'
        });
    }
});

// Get single patient record
router.get('/patients/:id', async (req, res) => {
    try {
        const patient = await User.findOne({
            _id: req.params.id,
            role: 'patient'
        }).select('name email phone dateOfBirth gender bloodGroup allergies emergencyContact isActive');

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        res.json({
            success: true,
            data: patient
        });
    } catch (error) {
        console.error('Get patient record error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching patient record'
        });
    }
});

// Update patient record
router.put('/patients/:id', async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            dateOfBirth,
            gender,
            bloodGroup,
            allergies,
            emergencyContact,
            isActive
        } = req.body;

        // Build patient object
        const patientFields = {};
        if (name) patientFields.name = name;
        if (email) patientFields.email = email;
        if (phone) patientFields.phone = phone;
        if (dateOfBirth) patientFields.dateOfBirth = dateOfBirth;
        if (gender) patientFields.gender = gender;
        if (bloodGroup) patientFields.bloodGroup = bloodGroup;
        if (allergies) patientFields.allergies = allergies;
        if (emergencyContact) patientFields.emergencyContact = emergencyContact;
        if (isActive !== undefined) patientFields.isActive = isActive;

        let patient = await User.findOne({
            _id: req.params.id,
            role: 'patient'
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        patient = await User.findByIdAndUpdate(
            req.params.id,
            { $set: patientFields },
            { new: true }
        ).select('name email phone dateOfBirth gender bloodGroup allergies emergencyContact isActive');

        res.json({
            success: true,
            data: patient
        });
    } catch (error) {
        console.error('Update patient record error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating patient record'
        });
    }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
    try {
        const { timeRange } = req.query;
        const now = new Date();
        let startDate, endDate;

        // Set date range based on timeRange parameter
        switch (timeRange) {
            case 'week':
                startDate = startOfWeek(now);
                endDate = endOfWeek(now);
                break;
            case 'month':
                startDate = startOfMonth(now);
                endDate = endOfMonth(now);
                break;
            case 'year':
                startDate = startOfYear(now);
                endDate = endOfYear(now);
                break;
            default:
                startDate = subDays(now, 7); // Default to last 7 days
                endDate = now;
        }

        // Get appointment statistics
        const appointments = await Appointment.find({
            date: { $gte: startDate, $lte: endDate }
        });

        // Generate daily data points for the graph
        const appointmentHistory = [];
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dayStart = new Date(currentDate);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);

            const dayAppointments = appointments.filter(apt => {
                const aptDate = new Date(apt.date);
                return aptDate >= dayStart && aptDate <= dayEnd;
            });

            appointmentHistory.push({
                date: currentDate.toISOString().split('T')[0],
                total: dayAppointments.length
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        const appointmentStats = {
            total: appointments.length,
            completed: appointments.filter(apt => apt.status === 'completed').length,
            cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
            history: appointmentHistory
        };

        // Get patient statistics
        const patientStats = {
            total: await User.countDocuments({ role: 'patient' }),
            new: await User.countDocuments({
                role: 'patient',
                createdAt: { $gte: startDate, $lte: endDate }
            }),
            active: await User.countDocuments({
                role: 'patient',
                isActive: true
            })
        };

        // Get doctor performance data
        const doctors = await User.find({ role: 'doctor' })
            .select('name')
            .lean();

        const doctorPerformance = await Promise.all(doctors.map(async (doctor) => {
            const doctorAppointments = await Appointment.find({
                doctor: doctor._id,
                date: { $gte: startDate, $lte: endDate }
            });

            const completed = doctorAppointments.filter(apt => apt.status === 'completed').length;
            const total = doctorAppointments.length;

            return {
                name: doctor.name,
                appointments: total,
                successRate: total > 0 ? Math.round((completed / total) * 100) : 0
            };
        }));

        // Get specialty distribution
        const doctorDetails = await Doctor.find().populate('user', 'name');
        const specialtyDistribution = doctorDetails.reduce((acc, doctor) => {
            if (doctor.specialization) {
                acc[doctor.specialization] = (acc[doctor.specialization] || 0) + 1;
            }
            return acc;
        }, {});

        const specialtyData = Object.entries(specialtyDistribution).map(([specialty, count]) => ({
            specialty,
            count
        }));

        res.json({
            success: true,
            data: {
                appointments: appointmentStats,
                patients: patientStats,
                doctors: {
                    performance: doctorPerformance,
                    specialtyDistribution: specialtyData
                }
            }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching analytics data'
        });
    }
});

// Get single doctor schedule
router.get('/doctor-schedules/:id', async (req, res) => {
    try {
        const schedule = await Schedule.findById(req.params.id)
            .populate({
                path: 'doctor',
                select: 'name email specialization',
                model: 'User'
            });

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Schedule not found'
            });
        }

        res.json({
            success: true,
            data: schedule
        });
    } catch (error) {
        console.error('Get doctor schedule error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching doctor schedule'
        });
    }
});

// Update doctor schedule
router.put('/doctor-schedules/:id', async (req, res) => {
    try {
        const {
            doctor,
            weeklySchedule,
            defaultSlotDuration,
            breakTime,
            startTime,
            endTime
        } = req.body;

        // Find the existing schedule
        let schedule = await Schedule.findById(req.params.id);
        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Schedule not found'
            });
        }

        // Preserve existing time slots for each day
        let updatedWeeklySchedule = [];
        if (weeklySchedule) {
            updatedWeeklySchedule = weeklySchedule.map((newDay) => {
                // Find the corresponding day in the existing schedule
                const existingDay = schedule.weeklySchedule.find(
                    (day) => day.day === newDay.day
                );

                // If the day exists and is still a working day, preserve its time slots
                if (existingDay && newDay.isWorkingDay) {
                    return {
                        ...newDay,
                        timeSlots: existingDay.timeSlots || []
                    };
                }

                // If it's not a working day or doesn't exist, use empty time slots
                return newDay;
            });
        }

        // Build schedule object with preserved time slots
        const scheduleFields = {};
        if (doctor) scheduleFields.doctor = doctor;
        if (weeklySchedule) scheduleFields.weeklySchedule = updatedWeeklySchedule;
        if (defaultSlotDuration) scheduleFields.defaultSlotDuration = defaultSlotDuration;
        if (breakTime) scheduleFields.breakTime = breakTime;
        if (startTime) scheduleFields.startTime = startTime;
        if (endTime) scheduleFields.endTime = endTime;

        // Add updatedAt timestamp
        scheduleFields.updatedAt = new Date();

        // Update the schedule
        schedule = await Schedule.findByIdAndUpdate(
            req.params.id,
            { $set: scheduleFields },
            { new: true }
        ).populate({
            path: 'doctor',
            select: 'name email specialization',
            model: 'User'
        });

        res.json({
            success: true,
            data: schedule
        });
    } catch (error) {
        console.error('Update doctor schedule error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating doctor schedule'
        });
    }
});

// Create doctor schedule
router.post('/doctor-schedules', async (req, res) => {
    try {
        const {
            doctor,
            weeklySchedule,
            defaultSlotDuration,
            breakTime,
            startTime,
            endTime
        } = req.body;

        // Check if doctor already has a schedule
        const existingSchedule = await Schedule.findOne({ doctor });
        if (existingSchedule) {
            return res.status(400).json({
                success: false,
                message: 'Doctor already has a schedule'
            });
        }

        const schedule = new Schedule({
            doctor,
            weeklySchedule,
            defaultSlotDuration,
            breakTime,
            startTime,
            endTime
        });

        await schedule.save();

        const populatedSchedule = await Schedule.findById(schedule._id)
            .populate({
                path: 'doctor',
                select: 'name email specialization',
                model: 'User'
            });

        res.status(201).json({
            success: true,
            data: populatedSchedule
        });
    } catch (error) {
        console.error('Create doctor schedule error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating doctor schedule'
        });
    }
});

// Delete doctor schedule
router.delete('/doctor-schedules/:id', async (req, res) => {
    try {
        const schedule = await Schedule.findById(req.params.id);
        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Schedule not found'
            });
        }

        await schedule.remove();

        res.json({
            success: true,
            message: 'Schedule deleted successfully'
        });
    } catch (error) {
        console.error('Delete doctor schedule error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting doctor schedule'
        });
    }
});

module.exports = router;