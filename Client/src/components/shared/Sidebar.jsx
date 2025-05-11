import React from 'react';
import { Box, VStack, Text, Icon, Button } from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiCalendar, FiUsers, FiSettings, FiLogOut, FiClock, FiFileText, FiClipboard, FiMessageSquare } from 'react-icons/fi';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user'));
  const userRole = user?.role || 'patient';

  console.log('Sidebar Debug:', {
    user,
    userRole,
    currentPath: location.pathname
  });

  const menuItems = {
    admin: [
      { icon: FiHome, label: 'Dashboard', path: '/admin/dashboard' },
      { icon: FiUsers, label: 'User Management', path: '/admin/users' },
      { icon: FiSettings, label: 'Settings', path: '/admin/settings' },
    ],
    doctor: [
      { icon: FiHome, label: 'Dashboard', path: '/doctor/dashboard' },
      { icon: FiCalendar, label: 'Appointments', path: '/doctor/appointments' },
      { icon: FiClock, label: 'Schedule', path: '/doctor/schedule' },
      { icon: FiFileText, label: 'Medical Records', path: '/doctor/medical-records' },
      { icon: FiClipboard, label: 'Prescriptions', path: '/doctor/prescriptions' },
      { icon: FiMessageSquare, label: 'Chat', path: '/doctor/chat' },
      { icon: FiSettings, label: 'Profile', path: '/doctor/profile' },
    ],
    patient: [
      { icon: FiHome, label: 'Dashboard', path: '/patient/dashboard' },
      { icon: FiCalendar, label: 'Book Appointment', path: '/patient/book-appointment' },
      { icon: FiFileText, label: 'Medical Records', path: '/patient/medical-records' },
      { icon: FiClipboard, label: 'Prescriptions', path: '/patient/prescriptions' },
      { icon: FiMessageSquare, label: 'Chat', path: '/patient/chat' },
      { icon: FiSettings, label: 'Profile', path: '/patient/profile' },
    ],
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // If no user is logged in, show nothing
  if (!user) {
    return null;
  }

  return (
    <Box
      w="250px"
      h="100vh"
      bg="white"
      borderRight="1px"
      borderColor="gray.200"
      py={8}
      px={4}
    >
      <VStack spacing={8} align="stretch">
        <Text fontSize="2xl" fontWeight="bold" textAlign="center" color="blue.600">
          HMS
        </Text>

        <VStack spacing={2} align="stretch">
          {menuItems[userRole]?.map((item) => (
            <Button
              key={item.path}
              leftIcon={<Icon as={item.icon} />}
              variant={location.pathname === item.path ? 'solid' : 'ghost'}
              colorScheme={location.pathname === item.path ? 'blue' : 'gray'}
              justifyContent="flex-start"
              w="100%"
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </Button>
          ))}
        </VStack>

        <Button
          leftIcon={<Icon as={FiLogOut} />}
          variant="ghost"
          colorScheme="red"
          mt="auto"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </VStack>
    </Box>
  );
};

export default Sidebar; 