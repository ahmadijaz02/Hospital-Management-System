# Hospital Management System

A comprehensive hospital management system built with the MERN stack (MongoDB, Express.js, React.js, Node.js).

## Features

### 1. Authentication & Authorization Module
- Login & Register (Patients)
- Admin adds doctors and staff
- JWT-based session handling
- Role-based access control (admin, doctor, staff, patient)
- Forgot/reset password

### 2. User Management Module (Admin Panel)
- Create/edit/delete doctors and staff
- Assign roles
- View activity logs
- Activate/deactivate users

### 3. Doctor Management Module
- Profile management
- Set/edit schedule (days and available hours)
- View upcoming appointments
- Access patient records
- Add visit notes and prescriptions
- Request lab tests

### 4. Patient Management Module
- Add/view/edit patient profile
- Medical history (diseases, allergies, surgeries)
- Upload/view medical reports
- Track visits and prescriptions
- Patient search/filter system

### 5. Appointment Management Module
- Patient books appointment with available doctor
- Live doctor availability calendar
- Admin/staff can create/edit/cancel appointments
- Confirmation/reminder emails or SMS
- Appointment statuses: pending, confirmed, completed, cancelled

### 6. Visit & Prescription Module
- Record symptoms, diagnosis, treatment
- Add prescriptions (with dose, frequency)
- Generate PDF of prescription
- Link visit to patient and appointment

### 7. Billing & Payment Module
- Auto-generate bill after visit
- Add services/items to invoice
- Mark invoice as paid/unpaid
- Payment history for patients
- Generate downloadable receipts

### 8. Laboratory & Test Management Module
- Test order by doctor
- Lab staff updates results
- Attach PDF/image results
- Notify patient when report is ready
- Link test results to patient history

### 9. Pharmacy/Medication Module
- Add/manage medicines
- Track stock levels and expiry
- Dispense medicine for prescriptions
- Purchase history tracking

### 10. Dashboard & Reporting Module
- Admin dashboard with key metrics
- Doctor dashboard with appointments
- Financial reports
- Patient statistics

### 11. Notifications Module
- Email/SMS notifications
- In-app alerts
- Appointment reminders
- Test result notifications

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB
- JWT Authentication
- Nodemailer for emails
- PDFKit for PDF generation

### Frontend (To be implemented)
- React.js
- Redux for state management
- Material-UI for components
- React Router for navigation
- Axios for API calls

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/hospital-management-system.git
cd hospital-management-system
```

2. Install backend dependencies
```bash
npm install
```

3. Create a .env file in the root directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hospital-management
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=24h
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password
FROM_EMAIL=your_email@gmail.com
FROM_NAME=Hospital Management System
```

4. Start the development server
```bash
npm run dev
```

## API Documentation

### Authentication Routes
- POST /api/auth/register - Register a new user
- POST /api/auth/login - Login user
- GET /api/auth/me - Get current user
- POST /api/auth/forgotpassword - Forgot password

### Doctor Routes
- POST /api/doctors - Create a doctor (Admin only)
- GET /api/doctors - Get all doctors
- GET /api/doctors/:id - Get single doctor
- PUT /api/doctors/:id - Update doctor (Admin only)
- DELETE /api/doctors/:id - Delete doctor (Admin only)
- PUT /api/doctors/:id/schedule - Update doctor schedule (Doctor only)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Your Name - your.email@example.com
Project Link: https://github.com/yourusername/hospital-management-system 