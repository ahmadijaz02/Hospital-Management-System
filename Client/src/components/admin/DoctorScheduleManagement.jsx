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
    VStack,
    Checkbox,
    Grid,
    GridItem,
} from '@chakra-ui/react';
import { FiEdit2, FiCalendar } from 'react-icons/fi';
import axios from '../../utils/axios';

const DoctorScheduleManagement = () => {
    const [schedules, setSchedules] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const [formData, setFormData] = useState({
        doctorId: '',
        workingDays: [],
        startTime: '',
        endTime: '',
        breakStartTime: '',
        breakEndTime: '',
        slotDuration: 30,
    });

    useEffect(() => {
        fetchSchedules();
        fetchDoctors();
    }, []);

    const fetchSchedules = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/doctor-schedules');
            setSchedules(response.data.data);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to fetch schedules');
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to fetch schedules',
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
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleDayToggle = (day) => {
        const updatedDays = formData.workingDays.includes(day)
            ? formData.workingDays.filter(d => d !== day)
            : [...formData.workingDays, day];
        setFormData({
            ...formData,
            workingDays: updatedDays,
        });
    };

    const handleUpdateSchedule = async () => {
        try {
            if (!selectedSchedule?._id) {
                toast({
                    title: 'Error',
                    description: 'No schedule selected for update',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
                return;
            }

            // Prepare schedule data with the same structure expected by the schedule microservice
            const scheduleData = {
                weeklySchedule: daysOfWeek.map(day => ({
                    day,
                    isWorkingDay: formData.workingDays.includes(day),
                    // Time slots will be generated by the microservice
                    // We don't need to send timeSlots as they'll be generated server-side
                    timeSlots: []
                })),
                defaultSlotDuration: parseInt(formData.slotDuration),
                breakTime: {
                    start: formData.breakStartTime || "13:00",
                    end: formData.breakEndTime || "14:00"
                },
                maxPatientsPerSlot: 1, // Default value
                // Include start and end times if provided
                ...(formData.startTime && { startTime: formData.startTime }),
                ...(formData.endTime && { endTime: formData.endTime })
            };

            console.log('Updating schedule with data:', scheduleData);

            // Use the schedule microservice API instead of the admin API
            await axios.put(
                `/api/schedules/schedule/${formData.doctorId}`,
                scheduleData
            );

            toast({
                title: 'Success',
                description: 'Schedule updated successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            await fetchSchedules();
            onClose();
        } catch (error) {
            console.error('Update error:', error);
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update schedule',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleAddSchedule = async () => {
        try {
            // Prepare schedule data with the same structure expected by the schedule microservice
            const scheduleData = {
                doctor: formData.doctorId, // Required for creating a new schedule
                weeklySchedule: daysOfWeek.map(day => ({
                    day,
                    isWorkingDay: formData.workingDays.includes(day),
                    // Time slots will be generated by the microservice
                    // We don't need to send timeSlots as they'll be generated server-side
                    timeSlots: []
                })),
                defaultSlotDuration: parseInt(formData.slotDuration),
                breakTime: {
                    start: formData.breakStartTime || "13:00",
                    end: formData.breakEndTime || "14:00"
                },
                maxPatientsPerSlot: 1, // Default value
                // Include start and end times if provided
                ...(formData.startTime && { startTime: formData.startTime }),
                ...(formData.endTime && { endTime: formData.endTime })
            };

            console.log('Creating schedule with data:', scheduleData);

            // Use the schedule microservice API to create a new schedule
            const response = await axios.post('/api/schedules', scheduleData);
            toast({
                title: 'Success',
                description: 'Schedule added successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            fetchSchedules();
            onClose();
            setFormData({
                doctorId: '',
                workingDays: [],
                startTime: '',
                endTime: '',
                breakStartTime: '',
                breakEndTime: '',
                slotDuration: 30,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to add schedule',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

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
                <HStack justify="space-between" mb={5}>
                    <Heading size="lg">Doctor Schedule Management</Heading>
                    <Button leftIcon={<FiCalendar />} colorScheme="blue" onClick={() => {
                        setSelectedSchedule(null);
                        onOpen();
                    }}>
                        Add Schedule
                    </Button>
                </HStack>

                <Select
                    placeholder="Filter by doctor"
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    mb={5}
                >
                    <option value="">All Doctors</option>
                    {doctors.map(doctor => (
                        <option key={doctor._id} value={doctor._id}>
                            {doctor.name}
                        </option>
                    ))}
                </Select>
            </Box>

            <Table variant="simple">
                <Thead>
                    <Tr>
                        <Th>Doctor</Th>
                        <Th>Working Days</Th>
                        <Th>Working Hours</Th>
                        <Th>Break Time</Th>
                        <Th>Slot Duration</Th>
                        <Th>Actions</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {schedules
                        .filter(schedule => !selectedDoctor || schedule.doctor?._id === selectedDoctor)
                        .map((schedule) => (
                            <Tr key={schedule._id}>
                                <Td>{schedule.doctor?.name || 'N/A'}</Td>
                                <Td>
                                    {schedule.weeklySchedule
                                        ?.filter(day => day.isWorkingDay)
                                        .map(day => day.day)
                                        .join(', ') || 'No working days set'}
                                </Td>
                                <Td>{schedule.startTime && schedule.endTime ?
                                    `${schedule.startTime} - ${schedule.endTime}` :
                                    'Not set'}
                                </Td>
                                <Td>{schedule.breakTime?.start && schedule.breakTime?.end ?
                                    `${schedule.breakTime.start} - ${schedule.breakTime.end}` :
                                    'No break time set'}
                                </Td>
                                <Td>{`${schedule.defaultSlotDuration || 30} minutes`}</Td>
                                <Td>
                                    <IconButton
                                        icon={<FiEdit2 />}
                                        aria-label="Edit schedule"
                                        size="sm"
                                        colorScheme="blue"
                                        onClick={() => {
                                            setSelectedSchedule(schedule);
                                            setFormData({
                                                doctorId: schedule.doctor?._id || '',
                                                workingDays: schedule.weeklySchedule
                                                    ?.filter(day => day.isWorkingDay)
                                                    .map(day => day.day) || [],
                                                startTime: schedule.startTime || '',
                                                endTime: schedule.endTime || '',
                                                breakStartTime: schedule.breakTime?.start || '',
                                                breakEndTime: schedule.breakTime?.end || '',
                                                slotDuration: schedule.defaultSlotDuration || 30,
                                            });
                                            onOpen();
                                        }}
                                    />
                                </Td>
                            </Tr>
                        ))}
                </Tbody>
            </Table>

            <Modal isOpen={isOpen} onClose={onClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        {selectedSchedule ? 'Edit Schedule' : 'Add New Schedule'}
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4}>
                            <FormControl>
                                <FormLabel>Doctor</FormLabel>
                                <Select
                                    name="doctorId"
                                    value={formData.doctorId}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Select Doctor</option>
                                    {doctors.map(doctor => (
                                        <option key={doctor._id} value={doctor._id}>
                                            {doctor.name}
                                        </option>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl>
                                <FormLabel>Working Days</FormLabel>
                                <Grid templateColumns="repeat(4, 1fr)" gap={2}>
                                    {daysOfWeek.map(day => (
                                        <GridItem key={day}>
                                            <Checkbox
                                                isChecked={formData.workingDays.includes(day)}
                                                onChange={() => handleDayToggle(day)}
                                            >
                                                {day}
                                            </Checkbox>
                                        </GridItem>
                                    ))}
                                </Grid>
                            </FormControl>

                            <HStack spacing={4} width="100%">
                                <FormControl>
                                    <FormLabel>Start Time</FormLabel>
                                    <Input
                                        name="startTime"
                                        type="time"
                                        value={formData.startTime}
                                        onChange={handleInputChange}
                                    />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>End Time</FormLabel>
                                    <Input
                                        name="endTime"
                                        type="time"
                                        value={formData.endTime}
                                        onChange={handleInputChange}
                                    />
                                </FormControl>
                            </HStack>

                            <HStack spacing={4} width="100%">
                                <FormControl>
                                    <FormLabel>Break Start</FormLabel>
                                    <Input
                                        name="breakStartTime"
                                        type="time"
                                        value={formData.breakStartTime}
                                        onChange={handleInputChange}
                                    />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>Break End</FormLabel>
                                    <Input
                                        name="breakEndTime"
                                        type="time"
                                        value={formData.breakEndTime}
                                        onChange={handleInputChange}
                                    />
                                </FormControl>
                            </HStack>

                            <FormControl>
                                <FormLabel>Slot Duration (minutes)</FormLabel>
                                <Select
                                    name="slotDuration"
                                    value={formData.slotDuration}
                                    onChange={handleInputChange}
                                >
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={45}>45 minutes</option>
                                    <option value={60}>60 minutes</option>
                                </Select>
                            </FormControl>
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            colorScheme="blue"
                            onClick={selectedSchedule ? handleUpdateSchedule : handleAddSchedule}
                        >
                            {selectedSchedule ? 'Update' : 'Add'}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Container>
    );
};

export default DoctorScheduleManagement;