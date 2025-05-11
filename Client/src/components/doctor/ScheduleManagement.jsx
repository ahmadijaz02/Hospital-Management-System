import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  SimpleGrid,
  FormControl,
  FormLabel,
  Select,
  Button,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  HStack,
  Text,
  Switch,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Input
} from '@chakra-ui/react';
import Layout from '../shared/Layout';
import axios from '../../utils/axios';

const DEFAULT_SCHEDULE = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
].map(day => ({
  day,
  isWorkingDay: false,
  timeSlots: []
}));

const DEFAULT_SLOT_DURATION = 30;
const DEFAULT_START_TIME = '09:00';
const DEFAULT_END_TIME = '17:00';

const ScheduleManagement = () => {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  
  // Get user info from localStorage
  const getUserInfo = () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      if (!userData || !userData.id) {
        throw new Error('No valid user data found');
      }
      return userData;
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  };

  // Initialize user data
  useEffect(() => {
    const userData = getUserInfo();
    setUser(userData);
  }, []);
  
  // Load doctor's schedule
  const fetchSchedule = async () => {
    if (!user) {
      setError('User information not found. Please try logging in again.');
      return;
    }

    try {
      console.log('Fetching schedule for user:', { userId: user.id, role: user.role });
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/schedules/schedule/${user.id}`);
      console.log('Schedule API response:', response.data);
      
      if (response.data.success) {
        setSchedule(response.data.data);
      }
    } catch (error) {
      console.error('Schedule fetch error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch schedule';
      setError(errorMessage);
      
      if (error.response?.status === 403) {
        toast({
          title: 'Access Denied',
          description: 'You are not authorized to view this schedule.',
          status: 'error',
          duration: 5000,
          isClosable: true
        });
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch schedule when user data is available
  useEffect(() => {
    if (user) {
      fetchSchedule();
    }
  }, [user]);

  const generateTimeSlots = (startTime, endTime, duration, breakStart, breakEnd) => {
    const slots = [];
    let currentTime = new Date(`2000-01-01T${startTime}`);
    const endDateTime = new Date(`2000-01-01T${endTime}`);
    const breakStartTime = new Date(`2000-01-01T${breakStart}`);
    const breakEndTime = new Date(`2000-01-01T${breakEnd}`);

    while (currentTime < endDateTime) {
      const slotStart = currentTime.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
      });

      currentTime = new Date(currentTime.getTime() + duration * 60000);
      
      // Skip break time
      if (currentTime > breakStartTime && currentTime <= breakEndTime) {
        currentTime = new Date(breakEndTime);
        continue;
      }

      const slotEnd = currentTime.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
      });

      if (currentTime <= endDateTime) {
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: true
        });
      }
    }

    return slots;
  };

  const handleGenerateSlots = () => {
    if (!schedule) return;

    const updatedSchedule = {
      ...schedule,
      weeklySchedule: schedule.weeklySchedule.map(day => ({
        ...day,
        timeSlots: day.isWorkingDay ? generateTimeSlots(
          DEFAULT_START_TIME,
          DEFAULT_END_TIME,
          schedule.defaultSlotDuration,
          schedule.breakTime.start,
          schedule.breakTime.end
        ) : []
      }))
    };

    setSchedule(updatedSchedule);
  };

  const handleToggleDay = async (dayIndex) => {
    if (!user) return;

    try {
      setLoading(true);
      const currentDay = schedule.weeklySchedule[dayIndex];
      const newIsWorkingDay = !currentDay.isWorkingDay;
      
      console.log('Updating day schedule:', {
        dayIndex,
        currentDay,
        newIsWorkingDay
      });

      const updatedDaySchedule = {
        isWorkingDay: newIsWorkingDay,
        timeSlots: newIsWorkingDay ? generateTimeSlots(
          DEFAULT_START_TIME,
          DEFAULT_END_TIME,
          schedule.defaultSlotDuration || DEFAULT_SLOT_DURATION,
          schedule.breakTime?.start || '13:00',
          schedule.breakTime?.end || '14:00'
        ) : []
      };

      console.log('Sending updated day schedule:', updatedDaySchedule);
      const response = await axios.patch(
        `/api/schedules/schedule/${user.id}/${currentDay.day}`,
        updatedDaySchedule
      );

      console.log('Toggle day response:', response.data);

      if (response.data.success) {
        const updatedSchedule = {
          ...schedule,
          weeklySchedule: schedule.weeklySchedule.map((day, index) => 
            index === dayIndex ? {
              ...day,
              isWorkingDay: newIsWorkingDay,
              timeSlots: updatedDaySchedule.timeSlots
            } : day
          )
        };
        setSchedule(updatedSchedule);
        
        toast({
          title: 'Success',
          description: `Schedule for ${currentDay.day} updated successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('Failed to update day schedule:', error.response || error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || `Failed to update schedule for ${schedule.weeklySchedule[dayIndex].day}`,
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('Saving schedule:', {
        userId: user.id,
        schedule
      });
      
      // Create initial time slots if none exist
      const scheduleToSave = {
        weeklySchedule: schedule.weeklySchedule.map(day => ({
          ...day,
          timeSlots: day.timeSlots.length === 0 && day.isWorkingDay ? 
            generateTimeSlots(
              DEFAULT_START_TIME,
              DEFAULT_END_TIME,
              schedule.defaultSlotDuration,
              schedule.breakTime.start,
              schedule.breakTime.end
            ) : day.timeSlots
        })),
        defaultSlotDuration: schedule.defaultSlotDuration || DEFAULT_SLOT_DURATION,
        breakTime: schedule.breakTime || { start: '13:00', end: '14:00' },
        maxPatientsPerSlot: schedule.maxPatientsPerSlot || 1
      };

      console.log('Sending schedule data:', scheduleToSave);
      const response = await axios.put(`/api/schedules/schedule/${user.id}`, scheduleToSave);
      console.log('Save schedule response:', response.data);

      if (response.data.success) {
        setSchedule(response.data.data);
        toast({
          title: 'Success',
          description: 'Schedule saved successfully',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('Save schedule error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save schedule',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = (field, value) => {
    setSchedule(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  const handleDayClick = (day, index) => {
    if (!day.isWorkingDay) {
      toast({
        title: "Day is not active",
        description: "Please enable the working day first to manage time slots.",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setSelectedDay({ ...day, index });
    onOpen();
  };

  const handleTimeSlotToggle = (startTime, endTime) => {
    if (!selectedDay) return;

    const timeSlot = {
      startTime,
      endTime,
      isAvailable: true
    };

    const existingSlotIndex = selectedDay.timeSlots.findIndex(
      slot => slot.startTime === startTime && slot.endTime === endTime
    );

    let updatedTimeSlots;
    if (existingSlotIndex >= 0) {
      // Remove the time slot if it exists
      updatedTimeSlots = selectedDay.timeSlots.filter((_, index) => index !== existingSlotIndex);
    } else {
      // Add the new time slot and sort by start time
      updatedTimeSlots = [...selectedDay.timeSlots, timeSlot].sort((a, b) => 
        a.startTime.localeCompare(b.startTime)
      );
    }

    setSelectedDay({
      ...selectedDay,
      timeSlots: updatedTimeSlots
    });
  };

  const handleSaveTimeSlots = async () => {
    if (!selectedDay || !user) return;

    try {
      setLoading(true);
      console.log('Saving time slots:', {
        day: selectedDay.day,
        timeSlots: selectedDay.timeSlots,
        isWorkingDay: true
      });

      const updatedDaySchedule = {
        isWorkingDay: true,
        timeSlots: selectedDay.timeSlots.map(slot => ({
          ...slot,
          isAvailable: true
        }))
      };

      console.log('Sending updated time slots:', updatedDaySchedule);
      const response = await axios.patch(
        `/api/schedules/schedule/${user.id}/${selectedDay.day}`,
        updatedDaySchedule
      );

      console.log('Save time slots response:', response.data);

      if (response.data.success) {
        const updatedSchedule = {
          ...schedule,
          weeklySchedule: schedule.weeklySchedule.map((day, index) =>
            index === selectedDay.index ? {
              ...day,
              isWorkingDay: true,
              timeSlots: updatedDaySchedule.timeSlots
            } : day
          )
        };
        setSchedule(updatedSchedule);
        onClose();
        toast({
          title: "Success",
          description: `Time slots for ${selectedDay.day} have been updated.`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Failed to save time slots:', error.response || error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save time slots",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate time slots for the modal
  const generateAvailableTimeSlots = () => {
    const slots = [];
    let currentTime = new Date(`2000-01-01T${DEFAULT_START_TIME}`);
    const endTime = new Date(`2000-01-01T${DEFAULT_END_TIME}`);
    const duration = schedule?.defaultSlotDuration || 30;

    while (currentTime < endTime) {
      const startTime = currentTime.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
      });

      currentTime = new Date(currentTime.getTime() + duration * 60000);
      
      if (currentTime <= endTime) {
        const endTimeSlot = currentTime.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit'
        });

        slots.push({ startTime, endTime: endTimeSlot });
      }
    }
    return slots;
  };

  if (!user) {
    return (
      <Layout>
        <Box p={4}>
          <Text>Loading user information...</Text>
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Box p={4}>
          <Text color="red.500">{error}</Text>
          <Button mt={4} onClick={fetchSchedule}>
            Retry
          </Button>
        </Box>
      </Layout>
    );
  }

  if (!schedule) {
    return (
      <Layout>
        <Box p={4}>
          <Text>Loading schedule...</Text>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box p={4}>
        <VStack spacing={6} align="stretch">
          <Heading size="lg">Schedule Management</Heading>

          {/* Schedule Settings */}
          <Box borderWidth={1} borderRadius="lg" p={4}>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Schedule Settings</Heading>
              
              <HStack spacing={6}>
                <FormControl>
                  <FormLabel>Default Slot Duration (minutes)</FormLabel>
                  <NumberInput
                    value={schedule.defaultSlotDuration}
                    min={5}
                    max={120}
                    onChange={(value) => handleUpdateSettings('defaultSlotDuration', parseInt(value))}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel>Max Patients Per Slot</FormLabel>
                  <NumberInput
                    value={schedule.maxPatientsPerSlot}
                    min={1}
                    max={10}
                    onChange={(value) => handleUpdateSettings('maxPatientsPerSlot', parseInt(value))}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
              </HStack>

              <HStack spacing={6}>
                <FormControl>
                  <FormLabel>Break Time Start</FormLabel>
                  <Input
                    type="time"
                    value={schedule.breakTime.start}
                    onChange={(e) => handleUpdateSettings('breakTime', {
                      ...schedule.breakTime,
                      start: e.target.value
                    })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Break Time End</FormLabel>
                  <Input
                    type="time"
                    value={schedule.breakTime.end}
                    onChange={(e) => handleUpdateSettings('breakTime', {
                      ...schedule.breakTime,
                      end: e.target.value
                    })}
                  />
                </FormControl>
              </HStack>
            </VStack>
          </Box>

          {/* Weekly Schedule */}
          <Box borderWidth={1} borderRadius="lg" p={4}>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Weekly Schedule</Heading>
              
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Day</Th>
                    <Th>Working Day</Th>
                    <Th>Time Slots</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {schedule.weeklySchedule.map((day, index) => (
                    <Tr key={day.day}>
                      <Td>{day.day}</Td>
                      <Td>
                        <Switch
                          isChecked={day.isWorkingDay}
                          onChange={() => handleToggleDay(index)}
                          isDisabled={loading}
                        />
                      </Td>
                      <Td>
                        {day.isWorkingDay ? (
                          day.timeSlots.length > 0 ? (
                            `${day.timeSlots.length} slots configured`
                          ) : (
                            'No slots configured'
                          )
                        ) : (
                          'Not a working day'
                        )}
                      </Td>
                      <Td>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleDayClick(day, index)}
                          isDisabled={!day.isWorkingDay || loading}
                        >
                          Manage Slots
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>

              <HStack spacing={4} justify="flex-end">
                <Button
                  colorScheme="blue"
                  onClick={handleGenerateSlots}
                  isLoading={loading}
                >
                  Generate Time Slots
                </Button>
                <Button
                  colorScheme="green"
                  onClick={handleSaveSchedule}
                  isLoading={loading}
                >
                  Save Schedule
                </Button>
              </HStack>
            </VStack>
          </Box>
        </VStack>

        {/* Time Slots Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              Configure Time Slots for {selectedDay?.day}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <Text>Click on time slots to toggle them on/off</Text>
                <SimpleGrid columns={[2, 3, 4]} spacing={4}>
                  {generateAvailableTimeSlots().map((slot) => {
                    const isSelected = selectedDay?.timeSlots.some(
                      existingSlot => 
                        existingSlot.startTime === slot.startTime && 
                        existingSlot.endTime === slot.endTime
                    );
                    return (
                      <Button
                        key={`${slot.startTime}-${slot.endTime}`}
                        size="sm"
                        colorScheme={isSelected ? "blue" : "gray"}
                        onClick={() => handleTimeSlotToggle(slot.startTime, slot.endTime)}
                      >
                        {slot.startTime} - {slot.endTime}
                      </Button>
                    );
                  })}
                </SimpleGrid>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleSaveTimeSlots}
                isLoading={loading}
              >
                Save Changes
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </Layout>
  );
};

export default ScheduleManagement; 