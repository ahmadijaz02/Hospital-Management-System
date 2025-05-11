const express = require('express');
const { check, validationResult } = require('express-validator');
const {
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    activateUser,
    deactivateUser,
    updateProfile
} = require('../controllers/users');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Get all doctors - Public route
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor', isActive: true })
      .select('name email specialization experience')
      .sort('name');

    res.json({
      success: true,
      doctors
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get user profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update user profile
router.put('/profile', [
  protect,
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('phone').optional().trim(),
    check('address').optional().trim(),
    check('dateOfBirth').optional().trim(),
    check('gender').optional().trim(),
    check('bloodGroup').optional().trim(),
    check('height').optional().trim(),
    check('weight').optional().trim(),
    check('medicalHistory').optional().trim(),
    check('allergies').optional().trim(),
    check('location').optional().isObject(),
    check('location.lat').optional().isFloat(),
    check('location.lng').optional().isFloat(),
    check('emergencyContact').optional()
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

    const {
      name,
      email,
      phone,
      address,
      dateOfBirth,
      gender,
      bloodGroup,
      height,
      weight,
      medicalHistory,
      allergies,
      location,
      emergencyContact
    } = req.body;
    
    // Check if email is being changed and if it's already in use
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    // Update user
    user.name = name;
    user.email = email;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (gender) user.gender = gender;
    if (bloodGroup) user.bloodGroup = bloodGroup;
    if (height) user.height = height;
    if (weight) user.weight = weight;
    if (medicalHistory) user.medicalHistory = medicalHistory;
    if (allergies) user.allergies = allergies;
    if (location && typeof location === 'object') {
      user.location = {
        lat: location.lat,
        lng: location.lng
      };
    }
    if (emergencyContact) user.emergencyContact = emergencyContact;

    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(user._id).select('-password');

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Route to allow doctors to get patients
router.get('/patients', protect, authorize('doctor'), async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient' })
      .select('-password')
      .sort('name');

    res.json({
      success: true,
      data: patients
    });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Protected routes
router.use(protect);

// User profile routes
router.route('/profile')
    .put(updateProfile);

// Admin only routes
router.use(authorize('admin'));

router.route('/')
    .get(getUsers);

router.route('/:id')
    .get(getUser)
    .put(updateUser)
    .delete(deleteUser);

router.route('/:id/activate')
    .put(activateUser);

router.route('/:id/deactivate')
    .put(deactivateUser);

module.exports = router; 