const express = require('express');
const { check, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const Schedule = require('../models/Schedule');
const MedicalRecord = require('../models/MedicalRecord');
const router = express.Router();

// Create new appointment
router.post('/create', [
  protect,
  authorize('patient'),
  [
    check('doctor', 'Doctor ID is required').not().isEmpty(),
    check('date', 'Date is required').not().isEmpty(),
    check('time', 'Time is required').not().isEmpty(),
    check('duration', 'Duration is required').not().isEmpty()
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { doctor, date, time, duration } = req.body;
    const patient = req.user.id;

    // Check if the time slot is available
    const schedule = await Schedule.findOne({ doctor });
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Doctor\'s schedule not found'
      });
    }

    // Get the day of week for the selected date
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Find the day in doctor's schedule
    const daySchedule = schedule.weeklySchedule.find(
      day => day.day === dayOfWeek && day.isWorkingDay
    );

    if (!daySchedule) {
      return res.status(400).json({
        success: false,
        message: 'Selected day is not a working day'
      });
    }

    // Find the selected time slot
    const timeSlot = daySchedule.timeSlots.find(
      slot => slot.startTime === time && slot.endTime === duration && slot.isAvailable
    );

    if (!timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Selected time slot is not available'
      });
    }

    // Check if slot is already booked
    const existingAppointment = await Appointment.findOne({
      doctor,
      date,
      time,
      status: { $ne: 'cancelled' }
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked'
      });
    }

    // Create appointment
    const appointment = new Appointment({
      doctor,
      patient,
      date,
      time,
      duration,
      status: 'scheduled'
    });

    await appointment.save();

    res.status(201).json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get patient's appointments
router.get('/my-appointments', [
  protect,
  authorize('patient')
], async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user.id })
      .populate('doctor', 'name specialization')
      .sort({ date: 1, time: 1 });

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get doctor's appointments
router.get('/doctor-appointments', [
  protect,
  authorize('doctor')
], async (req, res) => {
  try {
    // First, get all appointments for this doctor
    const allAppointments = await Appointment.find({ doctor: req.user.id })
      .populate('patient', 'name email phone address dateOfBirth gender bloodGroup height weight allergies emergencyContact')
      .sort({ date: 1, time: 1 });

    // Get all appointment IDs that already have medical records
    const appointmentsWithRecords = await MedicalRecord.distinct('appointment', { doctor: req.user.id });

    // Filter out appointments that already have medical records
    const appointments = allAppointments.filter(appointment => 
      !appointmentsWithRecords.some(recordAppointmentId => 
        recordAppointmentId.toString() === appointment._id.toString()
      )
    );

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Get doctor appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get doctor's appointments by type (today, upcoming, past)
router.get('/doctor/:type', [
  protect,
  authorize('doctor')
], async (req, res) => {
  try {
    const { type } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let query = { doctor: req.user.id };
    
    switch (type) {
      case 'today':
        // Get appointments for today
        query.date = {
          $gte: today,
          $lt: tomorrow
        };
        break;
        
      case 'upcoming':
        // Get future appointments (excluding today)
        query.date = {
          $gt: today
        };
        break;
        
      case 'past':
        // Get past appointments
        query.date = {
          $lt: today
        };
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid appointment type'
        });
    }

    console.log('Fetching appointments with query:', {
      type,
      query,
      userId: req.user.id
    });

    const appointments = await Appointment.find(query)
      .populate('patient', 'name email')
      .sort({ date: 1, time: 1 });

    console.log('Found appointments:', appointments.length);

    res.json({
      success: true,
      data: appointments
    });
  } catch (error) {
    console.error(`Get doctor's ${req.params.type} appointments error:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update appointment status
router.patch('/:id/status', [
  protect,
  authorize('doctor', 'admin'),
  check('status', 'Status is required').isIn(['scheduled', 'completed', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Only allow the assigned doctor or admin to update status
    if (req.user.role !== 'admin' && appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this appointment'
      });
    }

    appointment.status = req.body.status;
    await appointment.save();

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Reschedule appointment
router.patch('/:id/reschedule', [
    protect,
    authorize('doctor', 'admin'),
    check('date', 'Date is required').not().isEmpty(),
    check('time', 'Time is required').not().isEmpty()
], async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Allow both doctor and admin to reschedule
        if (req.user.role !== 'admin' && appointment.doctor.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        appointment.date = req.body.date;
        appointment.time = req.body.time;
        appointment.status = 'rescheduled';
        await appointment.save();

        res.json({
            success: true,
            appointment
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Update appointment notes
router.patch('/:id/notes', [
    protect,
    authorize('doctor', 'admin'),
    check('notes', 'Notes are required').not().isEmpty()
], async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Allow both doctor and admin to update notes
        if (req.user.role !== 'admin' && appointment.doctor.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        appointment.notes = req.body.notes;
        await appointment.save();

        res.json({
            success: true,
            appointment
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Patient cancel appointment
router.patch('/:id/cancel', [
  protect,
  authorize('patient')
], async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Verify that the appointment belongs to the patient
    if (appointment.patient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this appointment'
      });
    }

    // Check if appointment is in the past
    const appointmentDate = new Date(appointment.date);
    const today = new Date();
    if (appointmentDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel past appointments'
      });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update appointment status
router.patch('/:id/status', [
  protect,
  authorize('doctor', 'admin'),
  check('status', 'Status is required').isIn(['scheduled', 'completed', 'cancelled', 'rescheduled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Allow both doctor and admin to update status
    if (req.user.role !== 'admin' && appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    appointment.status = req.body.status;
    await appointment.save();

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update appointment schedule without changing status
router.patch('/:id/update-schedule', [
  protect,
  authorize('doctor', 'admin'),
  check('date', 'Date is required').not().isEmpty(),
  check('time', 'Time is required').not().isEmpty()
], async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Allow both doctor and admin to update schedule
    if (req.user.role !== 'admin' && appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Update date and time without changing status
    appointment.date = req.body.date;
    appointment.time = req.body.time;
    if (req.body.duration) {
      appointment.duration = req.body.duration;
    }
    
    await appointment.save();

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Update appointment schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Patient reschedule appointment
router.patch('/:id/patient-reschedule', [
  protect,
  authorize('patient'),
  check('date', 'Date is required').not().isEmpty(),
  check('time', 'Time is required').not().isEmpty(),
  check('duration', 'Duration is required').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Verify that the appointment belongs to the patient
    if (appointment.patient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reschedule this appointment'
      });
    }

    // Check if appointment is in the past
    const appointmentDate = new Date(appointment.date);
    const today = new Date();
    if (appointmentDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reschedule past appointments'
      });
    }

    const { date, time, duration } = req.body;
    const doctor = appointment.doctor;

    // Check if the new time slot is available
    const schedule = await Schedule.findOne({ doctor });
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Doctor\'s schedule not found'
      });
    }

    // Get the day of week for the selected date
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Find the day in doctor's schedule
    const daySchedule = schedule.weeklySchedule.find(
      day => day.day === dayOfWeek && day.isWorkingDay
    );

    if (!daySchedule) {
      return res.status(400).json({
        success: false,
        message: 'Selected day is not a working day'
      });
    }

    // Find the selected time slot
    const timeSlot = daySchedule.timeSlots.find(
      slot => slot.startTime === time && slot.endTime === duration && slot.isAvailable
    );

    if (!timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Selected time slot is not available'
      });
    }

    // Check if slot is already booked by another appointment
    const existingAppointment = await Appointment.findOne({
      doctor,
      date,
      time,
      status: { $ne: 'cancelled' },
      _id: { $ne: appointment._id } // Exclude the current appointment
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked'
      });
    }

    // Update appointment
    appointment.date = date;
    appointment.time = time;
    appointment.duration = duration;
    appointment.status = 'rescheduled';
    await appointment.save();

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Reschedule appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 