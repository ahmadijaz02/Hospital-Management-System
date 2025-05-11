import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Heading,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Button,
    useToast,
    Badge,
    HStack,
    Select,
    Input,
    IconButton,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    FormControl,
    FormLabel,
    useDisclosure,
    Spinner,
    Alert,
    AlertIcon,
    Text,
} from '@chakra-ui/react';
import { FiEdit2, FiTrash2, FiCalendar } from 'react-icons/fi';
import axios from '../../utils/axios';
import { format } from 'date-fns';

const AdminAppointmentManagement = () => {
    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();

    const [formData, setFormData] = useState({
        patientName: '',
        doctorId: '',
        date: '',
        time: '',
        status: 'scheduled',
        notes: '',
    });

    useEffect(() => {
        fetchAppointments();
        fetchDoctors();
    }, []);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/appointments');
            setAppointments(response.data.data);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to fetch appointments');
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to fetch appointments',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchDoctors = async () => {
        try {
            const response = await axios.get('/api/admin/doctors');
            setDoctors(response.data.data);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to fetch doctors list',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleUpdateAppointment = async () => {
        try {
            // First update the status if it has changed
            if (selectedAppointment.status !== formData.status) {
                console.log('Updating status to:', formData.status);
                await axios.patch(
                    `/api/appointments/${selectedAppointment._id}/status`,
                    { status: formData.status }
                );
            }

            // Update notes if they have changed
            if (selectedAppointment.notes !== formData.notes) {
                console.log('Updating notes');
                await axios.patch(
                    `/api/appointments/${selectedAppointment._id}/notes`,
                    { notes: formData.notes }
                );
            }

            // Update date and time if they have changed, but don't change the status
            if (selectedAppointment.date !== formData.date || selectedAppointment.time !== formData.time) {
                console.log('Updating date/time only');
                // Use a different endpoint that doesn't change status
                await axios.patch(
                    `/api/appointments/${selectedAppointment._id}/update-schedule`,
                    {
                        date: formData.date,
                        time: formData.time,
                        duration: selectedAppointment.duration
                    }
                );
            }

            toast({
                title: 'Success',
                description: 'Appointment updated successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            fetchAppointments();
            onClose();
        } catch (error) {
            console.error('Update appointment error:', error);
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update appointment',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleDeleteAppointment = async (appointmentId) => {
        if (window.confirm('Are you sure you want to delete this appointment?')) {
            try {
                const response = await axios.delete(`/api/admin/appointments/${appointmentId}`);
                
                if (response.data.success) {
                    toast({
                        title: 'Success',
                        description: 'Appointment deleted successfully',
                        status: 'success',
                        duration: 3000,
                        isClosable: true,
                    });
                    // Refresh the appointments list
                    fetchAppointments();
                } else {
                    throw new Error(response.data.message || 'Failed to delete appointment');
                }
            } catch (error) {
                console.error('Delete appointment error:', error);
                toast({
                    title: 'Error',
                    description: error.response?.data?.message || error.message || 'Failed to delete appointment',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    };

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return 'green';
            case 'scheduled':
                return 'blue';
            case 'cancelled':
                return 'red';
            case 'pending':
                return 'yellow';
            default:
                return 'gray';
        }
    };

    const filteredAppointments = appointments.filter(appointment => {
        const statusMatch = filterStatus === 'all' || appointment.status === filterStatus;
        const searchMatch = 
            (appointment.patient?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (appointment.doctor?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        return statusMatch && searchMatch;
    });

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
                <Spinner size="xl" />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert status="error">
                <AlertIcon />
                {error}
            </Alert>
        );
    }

    return (
        <Container maxW="container.xl" py={5}>
            <Box mb={5}>
                <Heading size="lg" mb={5}>Appointment Management</Heading>

                <HStack mb={5} spacing={4}>
                    <Select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        w="200px"
                    >
                        <option value="all">All Status</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="rescheduled">Rescheduled</option>
                    </Select>
                    <Input
                        placeholder="Search appointments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </HStack>
            </Box>

            <Table variant="simple">
                <Thead>
                    <Tr>
                        <Th>Patient</Th>
                        <Th>Doctor</Th>
                        <Th>Date</Th>
                        <Th>Time</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {filteredAppointments.map((appointment) => (
                        <Tr key={appointment._id}>
                            <Td>{appointment.patient?.name}</Td>
                            <Td>{appointment.doctor?.name}</Td>
                            <Td>{format(new Date(appointment.date), 'MMM dd, yyyy')}</Td>
                            <Td>{appointment.time}</Td>
                            <Td>
                                <Badge colorScheme={getStatusColor(appointment.status)}>
                                    {appointment.status}
                                </Badge>
                            </Td>
                            <Td>
                                <HStack spacing={2}>
                                    <IconButton
                                        icon={<FiEdit2 />}
                                        aria-label="Edit appointment"
                                        size="sm"
                                        colorScheme="blue"
                                        onClick={() => {
                                            setSelectedAppointment(appointment);
                                            setFormData({
                                                patientName: appointment.patient?.name || '',
                                                doctorId: appointment.doctor?._id || '',
                                                date: format(new Date(appointment.date), 'yyyy-MM-dd'),
                                                time: appointment.time,
                                                status: appointment.status,
                                                notes: appointment.notes || '',
                                            });
                                            onOpen();
                                        }}
                                    />
                                    <IconButton
                                        icon={<FiTrash2 />}
                                        aria-label="Delete appointment"
                                        size="sm"
                                        colorScheme="red"
                                        onClick={() => handleDeleteAppointment(appointment._id)}
                                    />
                                </HStack>
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>

            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Edit Appointment</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <FormControl mb={4}>
                            <FormLabel>Patient Name</FormLabel>
                            <Input
                                name="patientName"
                                value={formData.patientName}
                                onChange={handleInputChange}
                                isReadOnly
                            />
                        </FormControl>
                        <FormControl mb={4}>
                            <FormLabel>Doctor</FormLabel>
                            <Select
                                name="doctorId"
                                value={formData.doctorId}
                                onChange={handleInputChange}
                            >
                                {doctors.map(doctor => (
                                    <option key={doctor._id} value={doctor._id}>
                                        {doctor.name}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl mb={4}>
                            <FormLabel>Date</FormLabel>
                            <Input
                                name="date"
                                type="date"
                                value={formData.date}
                                onChange={handleInputChange}
                            />
                        </FormControl>
                        <FormControl mb={4}>
                            <FormLabel>Time</FormLabel>
                            <Input
                                name="time"
                                type="time"
                                value={formData.time}
                                onChange={handleInputChange}
                            />
                        </FormControl>
                        <FormControl mb={4}>
                            <FormLabel>Status</FormLabel>
                            <Select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                            >
                                <option value="scheduled">Scheduled</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="rescheduled">Rescheduled</option>
                            </Select>
                        </FormControl>
                        <FormControl mb={4}>
                            <FormLabel>Notes</FormLabel>
                            <Input
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                            />
                        </FormControl>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button colorScheme="blue" onClick={handleUpdateAppointment}>
                            Update
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Container>
    );
};

export default AdminAppointmentManagement; 