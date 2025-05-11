const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
    try {
        const { name, email, role } = req.body;

        let user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, role },
            {
                new: true,
                runValidators: true
            }
        ).select('-password');

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await user.remove();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Activate user
// @route   PUT /api/users/:id/activate
// @access  Private/Admin
exports.activateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive: true },
            {
                new: true,
                runValidators: true
            }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Deactivate user
// @route   PUT /api/users/:id/deactivate
// @access  Private/Admin
exports.deactivateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            {
                new: true,
                runValidators: true
            }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
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

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update basic info
        if (name) user.name = name;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (address) user.address = address;
        if (dateOfBirth) user.dateOfBirth = dateOfBirth;
        if (gender) user.gender = gender;
        if (bloodGroup) user.bloodGroup = bloodGroup;
        if (height) user.height = height;
        if (weight) user.weight = weight;
        if (medicalHistory) user.medicalHistory = medicalHistory;
        if (allergies) user.allergies = allergies;

        // Update location if provided
        if (location && location.lat && location.lng) {
            user.location = {
                lat: location.lat,
                lng: location.lng
            };
        }

        // Update emergency contact if provided
        if (emergencyContact) {
            user.emergencyContact = {
                name: emergencyContact.name || user.emergencyContact?.name,
                relationship: emergencyContact.relationship || user.emergencyContact?.relationship,
                phone: emergencyContact.phone || user.emergencyContact?.phone
            };
        }

        await user.save();

        // Remove sensitive data before sending response
        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.__v;

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: userResponse
        });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: err.message
        });
    }
}; 