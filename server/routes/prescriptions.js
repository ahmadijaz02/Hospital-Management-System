const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    createPrescription,
    updatePrescription,
    getPrescription,
    getPatientPrescriptions,
    getDoctorPrescriptions,
    getActivePatientPrescriptions,
    downloadPrescription
} = require('../controllers/prescriptions');

// Protect all routes
router.use(protect);

// Specific routes must come before dynamic routes with parameters

// Routes for specific paths
router.get('/doctor/prescriptions', authorize('doctor'), getDoctorPrescriptions);
router.get('/patient/:patientId/active', getActivePatientPrescriptions);
router.get('/patient/:patientId', getPatientPrescriptions);

// Routes for doctors only
router.post('/', authorize('doctor'), createPrescription);
router.put('/:id', authorize('doctor'), updatePrescription);

// Generic ID routes must be last to avoid capturing other routes
// Allow both doctors and patients to download and view prescriptions
router.get('/:id/download', authorize(['doctor', 'patient']), downloadPrescription);
router.get('/:id', authorize(['doctor', 'patient']), getPrescription);

module.exports = router;
