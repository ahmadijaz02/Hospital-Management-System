const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    createMedicalRecord,
    updateMedicalRecord,
    getMedicalRecord,
    getPatientMedicalRecords,
    getDoctorMedicalRecords,
    getAppointmentMedicalRecord
} = require('../controllers/medicalRecords');

// Protect all routes
router.use(protect);

// Specific routes must come before dynamic routes with parameters

// Routes for specific paths
router.get('/appointment/:appointmentId', getAppointmentMedicalRecord);
router.get('/doctor/records', authorize('doctor'), getDoctorMedicalRecords);
router.get('/patient/:patientId', getPatientMedicalRecords);

// Routes for doctors only
router.post('/', authorize('doctor'), createMedicalRecord);
router.put('/:id', authorize('doctor'), updateMedicalRecord);

// Generic ID route must be last to avoid capturing other routes
// Allow both doctors and patients to view individual medical records
router.get('/:id', authorize(['doctor', 'patient']), getMedicalRecord);

module.exports = router;
