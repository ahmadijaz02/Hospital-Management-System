const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const corsOptions = require('./config/corsOptions');
const dotenv = require('dotenv');
const helmet = require('helmet');
const appointmentRoutes = require('./routes/appointments');
const medicalRecordRoutes = require('./routes/medicalRecords');
const prescriptionRoutes = require('./routes/prescriptions');
const adminRoutes = require('./routes/admin');
const doctorRoutes = require('./routes/doctors');
const http = require('http');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);


// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(helmet());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log('MongoDB connection error:', err));



// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 