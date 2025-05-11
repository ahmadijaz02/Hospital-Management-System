const express = require('express');
const { check } = require('express-validator');
const {
    register,
    login,
    getMe,
    logout,
    googleAuth,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const registerValidation = [
    check('username', 'Username is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 8 or more characters').isLength({ min: 8 }),
    check('role', 'Role must be either admin, doctor, or patient').isIn(['admin', 'doctor', 'patient'])
];

const loginValidation = [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
];

const forgotPasswordValidation = [
    check('email', 'Please include a valid email').isEmail()
];

const resetPasswordValidation = [
    check('password', 'Please enter a password with 8 or more characters').isLength({ min: 8 })
];

// Auth routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/google', googleAuth);
router.post('/forgotpassword', forgotPasswordValidation, forgotPassword);
router.post('/resetpassword/:token', resetPasswordValidation, resetPassword);

module.exports = router;