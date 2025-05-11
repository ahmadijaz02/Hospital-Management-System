import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Heading,
  Text,
  Button,
  Badge,
  VStack,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Icon,
  Flex,
  Progress,
  Divider,
  Stack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FaUserMd, FaCalendarCheck, FaUserInjured, FaClock, FaCalendarAlt, FaFileAlt, FaPrescriptionBottleAlt, FaComments, FaUser, FaNotesMedical } from 'react-icons/fa';
import Layout from '../shared/Layout';
import axios from '../../utils/axios';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      activeAppointments: 0,
      todayAppointments: 0,
      totalPatients: 0,
      weeklyAppointments: 0,
      totalAppointments: 0
    },
    appointments: []
  });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First get all appointments
      const appointmentsResponse = await axios.get('/api/appointments/doctor-appointments');
      
      if (appointmentsResponse.data.success) {
        const appointments = appointmentsResponse.data.appointments || [];
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(today.getDate() + 7);
        const oneWeekFromNowStr = oneWeekFromNow.toISOString().split('T')[0];

        // Appointments in next 7 days (including today)
        const next7DaysAppointments = appointments.filter(apt => {
          const aptDate = new Date(apt.date).toISOString().split('T')[0];
          return aptDate >= todayStr && aptDate <= oneWeekFromNowStr && apt.status.toLowerCase() === 'scheduled';
        });

        // Calculate statistics
        const stats = {
          totalAppointments: appointments.length,
          completedAppointments: appointments.filter(apt => apt.status.toLowerCase() === 'completed').length,
          cancelledAppointments: appointments.filter(apt => apt.status.toLowerCase() === 'cancelled').length,
          todayAppointments: appointments.filter(apt => new Date(apt.date).toISOString().split('T')[0] === todayStr && apt.status.toLowerCase() === 'scheduled').length,
          weeklyAppointments: next7DaysAppointments.length
        };

        // Calculate active appointments (not completed or cancelled)
        const activeAppointments = appointments.filter(apt => 
          apt.status.toLowerCase() === 'scheduled' ||
          apt.status.toLowerCase() === 'rescheduled'
        ).length;

        // Get unique patients
        const uniquePatients = new Set(
          appointments.map(apt => apt.patient?._id || apt.patient)
        ).size;

        // Update dashboard data
        setDashboardData({
          stats: {
            ...stats,
            activeAppointments,
            totalPatients: uniquePatients
          },
          appointments: next7DaysAppointments.sort((a, b) => new Date(a.date) - new Date(b.date) || a.time.localeCompare(b.time))
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch dashboard data';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh data periodically
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 100000); // Refresh every 1 minutes
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'blue';
      case 'completed':
        return 'green';
      case 'cancelled':
        return 'red';
      case 'rescheduled':
        return 'orange';
      case 'in progress':
        return 'teal';
      default:
        return 'gray';
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formatTime = (timeString) => timeString;

  // Always show doctor name robustly
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  })();
  const doctorName = user.name || user.username || 'Doctor';

  // --- Button handlers (copied and adapted from AppointmentManagement) ---
  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      setLoading(true);
      const response = await axios.patch(`/api/appointments/${appointmentId}/status`, { status: newStatus });
      if (response.data.success) {
        setDashboardData(prev => ({
          ...prev,
          appointments: prev.appointments.map(apt => apt._id === appointmentId ? { ...apt, status: newStatus } : apt)
        }));
        toast({ title: 'Status Updated', description: 'Appointment status has been updated successfully.', status: 'success', duration: 3000, isClosable: true });
      }
    } catch (error) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update appointment status', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  };
  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    onOpen();
  };

  // --- Appointment Card (copied and adapted) ---
  const AppointmentCard = ({ appointment }) => (
    <Card mb={4} boxShadow="sm" borderRadius="lg">
      <CardBody>
        <Stack spacing={4}>
          <Flex justify="space-between" align="center">
            <HStack>
              <Icon as={FaUser} color="blue.500" />
              <Text fontWeight="bold">{appointment.patient?.name || 'Patient'}</Text>
            </HStack>
            <Badge colorScheme={getStatusColor(appointment.status)} fontSize="sm">
              {appointment.status}
            </Badge>
          </Flex>
          <Divider />
          <SimpleGrid columns={2} spacing={4}>
            <HStack>
              <Icon as={FaCalendarAlt} color="gray.500" />
              <Text>{formatDate(appointment.date)}</Text>
            </HStack>
            <HStack>
              <Icon as={FaClock} color="gray.500" />
              <Text>{formatTime(appointment.time)}</Text>
            </HStack>
          </SimpleGrid>
          {appointment.notes && (
            <HStack>
              <Icon as={FaNotesMedical} color="gray.500" />
              <Text noOfLines={2}>{appointment.notes}</Text>
            </HStack>
          )}
          <Divider />
          <HStack spacing={2} justify="flex-end">
            <Button size="sm" colorScheme="blue" onClick={() => handleViewDetails(appointment)}>
              View Details
            </Button>
            {appointment.status === 'scheduled' && (
              <>
                <Button size="sm" colorScheme="green" onClick={() => handleStatusChange(appointment._id, 'completed')}>
                  Complete
                </Button>
                <Button size="sm" colorScheme="red" onClick={() => handleStatusChange(appointment._id, 'cancelled')}>
                  Cancel
                </Button>
              </>
            )}
          </HStack>
        </Stack>
      </CardBody>
    </Card>
  );

  if (loading) {
    return (
      <Layout>
        <Box p={8} textAlign="center">
          <VStack spacing={4}>
            <Spinner size="xl" />
            <Text>Loading your dashboard...</Text>
          </VStack>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box p={6}>
        <VStack spacing={8} align="stretch">
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <Heading size="lg">Welcome Back, Dr. {doctorName}</Heading>
              <Text color="gray.600">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </VStack>
            <HStack spacing={3}>
              <Button 
                leftIcon={<Icon as={FaComments} />}
                colorScheme="purple"
                onClick={() => navigate('/doctor/chat')}
              >
                Chat
              </Button>
              <Button 
                leftIcon={<Icon as={FaFileAlt} />}
                colorScheme="teal"
                onClick={() => navigate('/doctor/medical-records')}
              >
                Medical Records
              </Button>
              <Button 
                leftIcon={<Icon as={FaPrescriptionBottleAlt} />}
                colorScheme="green"
                onClick={() => navigate('/doctor/prescriptions')}
              >
                Prescriptions
              </Button>
              <Button 
                leftIcon={<Icon as={FaCalendarAlt} />}
                colorScheme="blue"
                onClick={() => navigate('/doctor/appointments')}
              >
                Appointments
              </Button>
            </HStack>
          </HStack>

          {error && (
            <Alert status="error" borderRadius="lg">
              <AlertIcon />
              {error}
            </Alert>
          )}

          {/* Statistics Cards */}
          <SimpleGrid columns={[1, 2, 4]} spacing={6}>
            <Card>
              <CardBody>
                <VStack spacing={4} align="start">
                  <HStack>
                    <Icon as={FaCalendarAlt} color="blue.500" boxSize={6} />
                    <Text fontWeight="bold">Active Appointments</Text>
                  </HStack>
                  <Stat>
                    <StatNumber fontSize="3xl">{dashboardData.stats.activeAppointments}</StatNumber>
                    <StatHelpText>Not completed/cancelled</StatHelpText>
                  </Stat>
                  <Progress 
                    value={Math.min((dashboardData.stats.activeAppointments / 20) * 100, 100)} 
                    colorScheme="blue" 
                    w="100%" 
                    borderRadius="full"
                  />
                </VStack>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <VStack spacing={4} align="start">
                  <HStack>
                    <Icon as={FaCalendarCheck} color="green.500" boxSize={6} />
                    <Text fontWeight="bold">Today's Schedule</Text>
                  </HStack>
                  <Stat>
                    <StatNumber fontSize="3xl">{dashboardData.stats.todayAppointments}</StatNumber>
                    <StatHelpText>Scheduled for today</StatHelpText>
                  </Stat>
                  <Progress 
                    value={Math.min((dashboardData.stats.todayAppointments / 10) * 100, 100)} 
                    colorScheme="green" 
                    w="100%" 
                    borderRadius="full"
                  />
                </VStack>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <VStack spacing={4} align="start">
                  <HStack>
                    <Icon as={FaUserInjured} color="purple.500" boxSize={6} />
                    <Text fontWeight="bold">Total Patients</Text>
                  </HStack>
                  <Stat>
                    <StatNumber fontSize="3xl">{dashboardData.stats.totalPatients}</StatNumber>
                    <StatHelpText>Unique patients</StatHelpText>
                  </Stat>
                  <Progress 
                    value={Math.min((dashboardData.stats.totalPatients / 50) * 100, 100)} 
                    colorScheme="purple" 
                    w="100%" 
                    borderRadius="full"
                  />
                </VStack>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <VStack spacing={4} align="start">
                  <HStack>
                    <Icon as={FaClock} color="orange.500" boxSize={6} />
                    <Text fontWeight="bold">Weekly Load</Text>
                  </HStack>
                  <Stat>
                    <StatNumber fontSize="3xl">{dashboardData.stats.weeklyAppointments}</StatNumber>
                    <StatHelpText>Next 7 days</StatHelpText>
                  </Stat>
                  <Progress 
                    value={Math.min((dashboardData.stats.weeklyAppointments / 20) * 100, 100)} 
                    colorScheme="orange" 
                    w="100%" 
                    borderRadius="full"
                  />
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* 7-Day Schedule */}
          <Card>
            <CardHeader>
              <Heading size="md">Next 7 Days Schedule</Heading>
            </CardHeader>
            <CardBody>
              {dashboardData.appointments.length === 0 ? (
                <Box p={6} textAlign="center" bg="gray.50" borderRadius="lg">
                  <Text color="gray.600">No appointments scheduled for the next 7 days</Text>
                  <Button mt={4} colorScheme="blue" variant="outline" onClick={() => navigate('/doctor/appointments')}>
                    View All Appointments
                  </Button>
                </Box>
              ) : (
                <VStack spacing={4} align="stretch">
                  {dashboardData.appointments.map((appointment) => (
                    <AppointmentCard key={appointment._id} appointment={appointment} />
                  ))}
                </VStack>
              )}
            </CardBody>
          </Card>

          {/* Appointment Details Modal */}
          <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Appointment Details</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                {selectedAppointment && (
                  <VStack spacing={4} align="stretch">
                    <Heading size="md" mb={2}>Patient Information</Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel>Patient Name</FormLabel>
                        <Input value={selectedAppointment.patient?.name || 'Not provided'} isReadOnly />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Email</FormLabel>
                        <Input value={selectedAppointment.patient?.email || 'Not provided'} isReadOnly />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Phone Number</FormLabel>
                        <Input value={selectedAppointment.patient?.phone || 'Not provided'} isReadOnly />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Date of Birth</FormLabel>
                        <Input value={selectedAppointment.patient?.dateOfBirth || 'Not provided'} isReadOnly />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Gender</FormLabel>
                        <Input value={selectedAppointment.patient?.gender || 'Not provided'} isReadOnly />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Blood Group</FormLabel>
                        <Input value={selectedAppointment.patient?.bloodGroup || 'Not provided'} isReadOnly />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Height</FormLabel>
                        <Input value={selectedAppointment.patient?.height || 'Not provided'} isReadOnly />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Weight</FormLabel>
                        <Input value={selectedAppointment.patient?.weight || 'Not provided'} isReadOnly />
                      </FormControl>
                    </SimpleGrid>
                    <FormControl>
                      <FormLabel>Address</FormLabel>
                      <Input value={selectedAppointment.patient?.address || 'Not provided'} isReadOnly />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Allergies</FormLabel>
                      <Textarea value={selectedAppointment.patient?.allergies || 'None reported'} isReadOnly />
                    </FormControl>
                    {selectedAppointment.patient?.emergencyContact && (
                      <Box mt={2} p={3} borderWidth="1px" borderRadius="md">
                        <Heading size="sm" mb={2}>Emergency Contact</Heading>
                        <Text><strong>Name:</strong> {selectedAppointment.patient.emergencyContact.name || 'Not provided'}</Text>
                        <Text><strong>Relationship:</strong> {selectedAppointment.patient.emergencyContact.relationship || 'Not provided'}</Text>
                        <Text><strong>Phone:</strong> {selectedAppointment.patient.emergencyContact.phone || 'Not provided'}</Text>
                      </Box>
                    )}
                    <Divider my={4} />
                    <Heading size="md" mb={2}>Appointment Details</Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel>Date</FormLabel>
                        <Input value={selectedAppointment.date} isReadOnly />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Time</FormLabel>
                        <Input value={selectedAppointment.time} isReadOnly />
                      </FormControl>
                    </SimpleGrid>
                    <FormControl>
                      <FormLabel>Type</FormLabel>
                      <Input value={selectedAppointment.type || 'Regular Checkup'} isReadOnly />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Notes</FormLabel>
                      <Textarea value={selectedAppointment.notes || ''} isReadOnly />
                    </FormControl>
                  </VStack>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" mr={3} onClick={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </VStack>
      </Box>
    </Layout>
  );
};

export default DoctorDashboard; 