import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import GoogleAuthProvider from './components/auth/GoogleOAuthProvider';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import DoctorDashboard from './components/doctor/DoctorDashboard';
import AppointmentManagement from './components/doctor/AppointmentManagement';
import ScheduleManagement from './components/doctor/ScheduleManagement';
import DoctorProfile from './components/doctor/DoctorProfile';
import MedicalRecordManagement from './components/doctor/MedicalRecordManagement';
import PrescriptionManagement from './components/doctor/PrescriptionManagement';
import DoctorChat from './components/doctor/DoctorChat';
import PatientDashboard from './components/patient/PatientDashboard';
import BookAppointment from './components/patient/BookAppointment';
import PatientProfile from './components/patient/PatientProfile';
import MedicalRecords from './components/patient/MedicalRecords';
import Prescriptions from './components/patient/Prescriptions';
import PatientChat from './components/patient/PatientChat';
import AdminLayout from './components/admin/AdminLayout';
import UserManagement from './components/admin/UserManagement';
import AdminAppointmentManagement from './components/admin/AppointmentManagement';
import DoctorScheduleManagement from './components/admin/DoctorScheduleManagement';
import PatientRecordManagement from './components/admin/PatientRecordManagement';
import Analytics from './components/admin/Analytics';
import AdminDashboard from './components/admin/AdminDashboard';

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  console.log('ProtectedRoute Debug:', {
    token: token ? 'exists' : 'missing',
    user,
    allowedRoles,
    currentPath: window.location.pathname
  });

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.role.toLowerCase();
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Redirect to the appropriate dashboard based on user's role
    switch (userRole) {
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'doctor':
        return <Navigate to="/doctor/dashboard" replace />;
      case 'patient':
        return <Navigate to="/patient/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
};

function App() {
  return (
    <ChakraProvider>
      <GoogleAuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="appointments" element={<AdminAppointmentManagement />} />
                    <Route path="doctor-schedules" element={<DoctorScheduleManagement />} />
                    <Route path="patient-records" element={<PatientRecordManagement />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                  </Routes>
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Doctor Routes */}
          <Route
            path="/doctor/*"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <Routes>
                  <Route path="dashboard" element={<DoctorDashboard />} />
                  <Route path="appointments" element={<AppointmentManagement />} />
                  <Route path="schedule" element={<ScheduleManagement />} />
                  <Route path="profile" element={<DoctorProfile />} />
                  <Route path="medical-records" element={<MedicalRecordManagement />} />
                  <Route path="prescriptions" element={<PrescriptionManagement />} />
                  <Route path="chat" element={<DoctorChat />} />
                  <Route path="*" element={<Navigate to="/doctor/dashboard" replace />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Patient Routes */}
          <Route
            path="/patient/*"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <Routes>
                  <Route path="dashboard" element={<PatientDashboard />} />
                  <Route path="book-appointment" element={<BookAppointment />} />
                  <Route path="profile" element={<PatientProfile />} />
                  <Route path="medical-records" element={<MedicalRecords />} />
                  <Route path="prescriptions" element={<Prescriptions />} />
                  <Route path="chat" element={<PatientChat />} />
                  <Route path="*" element={<Navigate to="/patient/dashboard" replace />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Default Route - Redirect to appropriate dashboard if logged in */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </GoogleAuthProvider>
    </ChakraProvider>
  );
}

export default App;
