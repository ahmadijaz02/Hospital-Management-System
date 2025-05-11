# Hospital Management System

A comprehensive Hospital Management System built with a microservices architecture. This system streamlines healthcare operations by integrating patient management, doctor scheduling, medical records, and real-time communication in a single platform.

## 🏥 Overview

This Hospital Management System is designed to modernize healthcare facility operations through a robust, scalable microservices architecture. The system provides a comprehensive solution for managing patients, doctors, appointments, medical records, and communications in a secure and efficient manner.

## ✨ Features

### 🔐 Authentication & Authorization
- Secure user registration and login
- Role-based access control (Admin, Doctor, Patient)
- Google OAuth integration
- Password reset functionality
- JWT-based authentication

### 👨‍⚕️ Doctor Management
- Doctor profile creation and management
- Specialization and qualification tracking
- Availability scheduling
- Consultation fee management

### 🧑‍⚕️ Patient Management
- Patient registration and profile management
- Medical history tracking
- Appointment booking
- Access to personal medical records

### 📅 Appointment System
- Real-time availability checking
- Appointment scheduling and management
- Appointment reminders
- Rescheduling and cancellation

### 📝 Medical Records
- Electronic health records (EHR)
- Prescription management
- Medical history tracking
- Secure access controls

### 💬 Real-time Chat
- Doctor-patient communication
- Real-time messaging
- Chat history
- Notification system

### 📊 Admin Dashboard
- System-wide analytics
- User management
- Service monitoring
- Configuration management

## 🛠️ Technology Stack

### Backend
- **Node.js & Express**: For building the API services
- **MongoDB**: Primary database for user data, appointments, and medical records
- **MySQL**: For chat service data storage
- **Socket.IO**: For real-time communication
- **JWT**: For secure authentication
- **Nodemailer**: For email notifications

### Frontend
- **React**: For building the user interface
- **Redux**: For state management
- **Material-UI**: For responsive design components
- **Axios**: For API communication
- **Socket.IO Client**: For real-time features

### DevOps & Infrastructure
- **Docker & Docker Compose**: For containerization and orchestration
- **Microservices Architecture**: For scalability and maintainability
- **API Gateway**: For routing and request handling

## 🏗️ Architecture

The system follows a microservices architecture with the following components:

1. **API Gateway**: Routes requests to appropriate services
2. **Auth Service**: Handles user authentication and authorization
3. **Main Service**: Manages core hospital operations
4. **Chat Service**: Provides real-time communication
5. **Schedule Service**: Manages appointments and doctor availability
6. **Client**: React-based frontend application

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/hospital-management-system.git
cd hospital-management-system
```
2. Start the application using Docker Compose
```bash
docker-compose up
```

3. Access the application
- Frontend: http://localhost:3000
- API Gateway: http://localhost:4000
- Auth Service: http://localhost:3001
- Main Service: http://localhost:5000
- Chat Service: http://localhost:5001
- Schedule Service: http://localhost:5002

## 📝 API Documentation

The API is organized around RESTful principles. The main endpoints include:

### Authentication
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Authenticate a user
- `POST /api/auth/google`: Authenticate with Google
- `POST /api/auth/forgotpassword`: Request password reset
- `PUT /api/auth/resetpassword/:token`: Reset password

### Users
- `GET /api/users/me`: Get current user profile
- `PUT /api/users/me`: Update user profile
- `GET /api/users/:id`: Get user by ID (admin only)

### Doctors
- `GET /api/doctors`: Get all doctors
- `GET /api/doctors/:id`: Get doctor by ID
- `PUT /api/doctors/:id`: Update doctor profile
- `GET /api/doctors/:id/availability`: Get doctor availability

### Appointments
- `POST /api/appointments`: Create a new appointment
- `GET /api/appointments`: Get user appointments
- `GET /api/appointments/:id`: Get appointment by ID
- `PUT /api/appointments/:id`: Update appointment
- `DELETE /api/appointments/:id`: Cancel appointment

### Medical Records
- `POST /api/medical-records`: Create a medical record
- `GET /api/medical-records`: Get patient medical records
- `GET /api/medical-records/:id`: Get medical record by ID
- `PUT /api/medical-records/:id`: Update medical record

### Chat
- `GET /api/chat/messages`: Get chat history
- `POST /api/chat/messages`: Send a message

## 🔒 Security

The system implements several security measures:

- JWT-based authentication
- Password hashing using bcrypt
- HTTPS for all communications
- Role-based access control
- Input validation and sanitization
- Rate limiting to prevent abuse
- Secure password reset flow


## 🙏 Acknowledgements

- [Node.js](https://nodejs.org/)
- [React](https://reactjs.org/)
- [MongoDB](https://www.mongodb.com/)
- [Express](https://expressjs.com/)
- [Docker](https://www.docker.com/)
- [Socket.IO](https://socket.io/)
- [Material-UI](https://material-ui.com/)

---

This Hospital Management System aims to improve healthcare service delivery by providing a modern, efficient, and user-friendly platform for managing hospital operations. We welcome feedback and contributions to make this system even better!
