const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');

const seedDoctor = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/hospital');
        console.log('Connected to MongoDB...');

        // Create doctor data
        const doctorData = {
            user: '68135b34c91872f2a8972180', // Your user ID
            specialization: 'General Medicine',
            qualification: 'MBBS, MD',
            experience: 5,
            consultationFee: 1500,
            isAvailable: true,
            bio: 'Experienced general physician with expertise in primary healthcare and preventive medicine.',
            languages: ['English', 'Urdu'],
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
        };

        // Check if doctor already exists
        const existingDoctor = await Doctor.findOne({ user: doctorData.user });
        if (existingDoctor) {
            console.log('Doctor record already exists. Updating...');
            const updatedDoctor = await Doctor.findOneAndUpdate(
                { user: doctorData.user },
                doctorData,
                { new: true }
            );
            console.log('Doctor record updated:', updatedDoctor);
        } else {
            // Create new doctor record
            const doctor = new Doctor(doctorData);
            await doctor.save();
            console.log('Doctor record created:', doctor);
        }

        console.log('Seed completed successfully');
    } catch (error) {
        console.error('Seed error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the seed function
seedDoctor(); 