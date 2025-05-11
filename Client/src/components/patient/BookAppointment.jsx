import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Button,
  useToast,
  Text,
  SimpleGrid,
  HStack,
  Spinner,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  Avatar,
  Stack,
  Badge,
  Divider,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  FormControl,
  FormLabel,
  Flex,
  Collapse,
  useDisclosure
} from '@chakra-ui/react';
import { SearchIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import Layout from '../shared/Layout';
import axios from '../../utils/axios';

const BookAppointment = () => {
  const toast = useToast();
  const { isOpen: isFilterOpen, onToggle: onFilterToggle } = useDisclosure();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorSchedule, setDoctorSchedule] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState({
    searchQuery: '',
    specialization: '',
    minExperience: '',
    maxFee: ''
  });

  // Get user info from localStorage
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    if (!userData || !token) {
      setError('Authentication required');
      return;
    }

    setUser(userData);
    setMounted(true);
  }, []);

  // Fetch doctors when component is mounted
  useEffect(() => {
    if (!mounted || !user) return;
    fetchDoctors();
    return () => setMounted(false);
  }, [mounted, user]);

  // Apply filters whenever doctors or filters change
  useEffect(() => {
    if (doctors.length > 0) {
      applyFilters();
    }
  }, [doctors, filters]);

  // Extract unique specializations from doctors
  useEffect(() => {
    if (doctors.length > 0) {
      const uniqueSpecializations = [...new Set(doctors.map(doctor => doctor.specialization))].sort();
      setSpecializations(uniqueSpecializations);
    }
  }, [doctors]);
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const clearFilters = () => {
    setFilters({
      searchQuery: '',
      specialization: '',
      minExperience: '',
      maxFee: ''
    });
  };
  
  const applyFilters = () => {
    let filtered = [...doctors];
    
    // Apply search filter
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const query = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(doctor => 
        doctor.name.toLowerCase().includes(query) ||
        doctor.specialization.toLowerCase().includes(query)
      );
    }
    
    // Apply specialization filter
    if (filters.specialization) {
      filtered = filtered.filter(doctor => 
        doctor.specialization === filters.specialization
      );
    }
    
    // Apply experience filter
    if (filters.minExperience) {
      const minExp = parseInt(filters.minExperience);
      if (!isNaN(minExp)) {
        filtered = filtered.filter(doctor => 
          doctor.experience >= minExp
        );
      }
    }
    
    // Apply fee filter
    if (filters.maxFee) {
      const maxFee = parseInt(filters.maxFee);
      if (!isNaN(maxFee)) {
        filtered = filtered.filter(doctor => 
          doctor.consultationFee <= maxFee
        );
      }
    }
    
    setFilteredDoctors(filtered);
  };

  // Fetch all doctors
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/doctors');
      
      if (response.data.success) {
        const doctorsList = response.data.data.map(doctor => ({
          _id: doctor.user._id,
          name: doctor.user.name,
          email: doctor.user.email,
          specialization: doctor.specialization,
          experience: doctor.experience,
          consultationFee: doctor.consultationFee,
          isAvailable: doctor.isAvailable
        })).filter(doctor => doctor.isAvailable); // Only show available doctors
        
        console.log('Processed doctors list:', doctorsList);
        setDoctors(doctorsList);
        setFilteredDoctors(doctorsList);
      } else {
        throw new Error('Failed to fetch doctors data');
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch doctors';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setError(errorMessage);
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  // Fetch doctor's schedule
  const fetchDoctorSchedule = async (doctorId) => {
    try {
      setLoading(true);
      console.log('Fetching schedule for doctor:', doctorId);
      const response = await axios.get(`/api/schedules/schedule/${doctorId}`);
      
      console.log('Doctor schedule response:', response.data);
      
      if (response.data.success) {
        const schedule = response.data.data;
        console.log('Setting doctor schedule:', schedule);
        setDoctorSchedule(schedule);
      } else {
        throw new Error(response.data.message || 'Failed to fetch doctor schedule');
      }
    } catch (error) {
      console.error('Error fetching doctor schedule:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to fetch doctor schedule',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setDoctorSchedule(null);
    } finally {
      setLoading(false);
    }
  };

  // Get next 4 weeks of dates for selected day
  const getNextFourWeeksDates = (selectedDay) => {
    const dates = [];
    const today = new Date();
    const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(selectedDay);
    
    // Find the next occurrence of the selected day
    let nextDate = new Date(today);
    while (nextDate.getDay() !== dayIndex) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    // Get 4 weeks of dates
    for (let i = 0; i < 4; i++) {
      const date = new Date(nextDate);
      dates.push(date.toISOString().split('T')[0]);
      nextDate.setDate(nextDate.getDate() + 7);
    }

    return dates;
  };

  // Fetch available slots for selected doctor and date
  const fetchAvailableSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `/api/schedules/schedule/${selectedDoctor._id}/available-slots/${selectedDate}`
      );
      
      if (response.data.success) {
        setAvailableSlots(response.data.availableSlots);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch available slots',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDoctor, selectedDate]);

  // Handle doctor selection
  const handleDoctorSelect = async (doctorId) => {
    console.log('Selected doctor:', doctorId);
    const doctor = doctors.find(d => d._id === doctorId);
    setSelectedDoctor(doctor);
    setSelectedDay(null);
    setSelectedDate('');
    setSelectedSlot(null);
    setAvailableSlots([]);
    setAvailableDates([]);
    
    if (doctor) {
      console.log('Fetching schedule for doctor:', doctor);
      await fetchDoctorSchedule(doctor._id);
    }
  };

  // Handle day selection
  const handleDaySelect = (day) => {
    console.log('Selected day:', day);
    console.log('Current doctor schedule:', doctorSchedule);
    
    const selectedDaySchedule = doctorSchedule.weeklySchedule.find(s => s.day === day);
    console.log('Selected day schedule:', selectedDaySchedule);
    
    if (!selectedDaySchedule || !selectedDaySchedule.isWorkingDay || !selectedDaySchedule.timeSlots || selectedDaySchedule.timeSlots.length === 0) {
      toast({
        title: 'No Slots Available',
        description: 'No time slots are available for this day',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setSelectedDay(day);
    setSelectedDate('');
    setSelectedSlot(null);
    setAvailableSlots([]);
    
    // Generate next 4 weeks of available dates for the selected day
    const dates = getNextFourWeeksDates(day);
    console.log('Generated dates for selected day:', dates);
    setAvailableDates(dates);
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  // Book appointment
  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot || !user) {
      toast({
        title: 'Error',
        description: 'Please select all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/appointments/create', {
        doctor: selectedDoctor._id,
        patient: user.id,
        date: selectedDate,
        time: selectedSlot.startTime,
        duration: selectedSlot.endTime
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Appointment booked successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Reset form
        setSelectedDoctor(null);
        setSelectedDay(null);
        setSelectedDate('');
        setSelectedSlot(null);
        setAvailableDates([]);
        setAvailableSlots([]);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to book appointment',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <Box p={4}>
          <Alert status="warning">
            <AlertIcon />
            Please log in to book appointments
          </Alert>
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Box p={4}>
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box p={4}>
        <VStack spacing={6} align="stretch">
          <HStack justify="space-between" mb={4}>
            <Heading size="lg">Book Appointment</Heading>
            <Button
              leftIcon={isFilterOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
              colorScheme="blue"
              variant="outline"
              onClick={onFilterToggle}
            >
              Filter Doctors
            </Button>
          </HStack>

          {/* Filter Panel */}
          <Collapse in={isFilterOpen} animateOpacity>
            <Box p={4} mb={4} bg="white" borderRadius="md" shadow="sm" borderWidth={1}>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Search Doctor</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <SearchIcon color="gray.300" />
                    </InputLeftElement>
                    <Input
                      placeholder="Search by name or specialization"
                      name="searchQuery"
                      value={filters.searchQuery}
                      onChange={handleFilterChange}
                    />
                  </InputGroup>
                </FormControl>

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} width="100%">
                  <FormControl>
                    <FormLabel>Specialization</FormLabel>
                    <Select
                      name="specialization"
                      value={filters.specialization}
                      onChange={handleFilterChange}
                      placeholder="All Specializations"
                    >
                      {specializations.map((spec) => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Min. Experience (Years)</FormLabel>
                    <Input
                      type="number"
                      name="minExperience"
                      value={filters.minExperience}
                      onChange={handleFilterChange}
                      placeholder="Any Experience"
                      min="0"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Max. Consultation Fee ($)</FormLabel>
                    <Input
                      type="number"
                      name="maxFee"
                      value={filters.maxFee}
                      onChange={handleFilterChange}
                      placeholder="Any Fee"
                      min="0"
                    />
                  </FormControl>
                </SimpleGrid>

                <Button alignSelf="flex-end" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </VStack>
            </Box>
          </Collapse>

          {/* Doctor Selection */}
          <Box borderWidth={1} borderRadius="lg" p={4}>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Select Doctor</Heading>
              {loading && !doctors.length ? (
                <VStack spacing={4}>
                  <Spinner size="xl" />
                  <Text>Loading doctors...</Text>
                </VStack>
              ) : filteredDoctors.length > 0 ? (
                <SimpleGrid columns={[1, 2, 3]} spacing={4}>
                  {filteredDoctors.map((doctor) => (
                    <Card
                      key={doctor._id}
                      cursor="pointer"
                      onClick={() => handleDoctorSelect(doctor._id)}
                      bg={selectedDoctor?._id === doctor._id ? 'blue.50' : 'white'}
                      borderWidth={2}
                      borderColor={selectedDoctor?._id === doctor._id ? 'blue.500' : 'gray.200'}
                    >
                      <CardBody>
                        <VStack spacing={4}>
                          <Avatar size="lg" name={doctor.name} />
                          <Stack spacing={2} textAlign="center">
                            <Heading size="sm">{doctor.name}</Heading>
                            <Text fontSize="sm" color="gray.600">
                              {doctor.specialization}
                            </Text>
                            <Text fontSize="sm">
                              Experience: {doctor.experience} years
                            </Text>
                            <Text fontSize="sm" color="blue.600">
                              Consultation Fee: ${doctor.consultationFee}
                            </Text>
                          </Stack>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              ) : (
                <Alert status="info">
                  <AlertIcon />
                  No doctors match your filter criteria. Try adjusting your filters.
                </Alert>
              )}
            </VStack>
          </Box>

          {/* Available Days */}
          {selectedDoctor && doctorSchedule && (
            <Box borderWidth={1} borderRadius="lg" p={4}>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Available Days</Heading>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  Select a day to view available appointment dates
                </Text>
                <SimpleGrid columns={[2, 3, 7]} spacing={4}>
                  {doctorSchedule.weeklySchedule.map((schedule) => (
                    <Button
                      key={schedule.day}
                      onClick={() => handleDaySelect(schedule.day)}
                      colorScheme={selectedDay === schedule.day ? 'blue' : 'gray'}
                      isDisabled={!schedule.isWorkingDay || !schedule.timeSlots || schedule.timeSlots.length === 0}
                    >
                      {schedule.day}
                    </Button>
                  ))}
                </SimpleGrid>
              </VStack>
            </Box>
          )}

          {/* Available Dates */}
          {selectedDay && availableDates.length > 0 && (
            <Box borderWidth={1} borderRadius="lg" p={4}>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Select Date</Heading>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  Next 4 weeks of available dates
                </Text>
                <SimpleGrid columns={[2, 3, 4]} spacing={4}>
                  {availableDates.map((date) => (
                    <Button
                      key={date}
                      onClick={() => handleDateSelect(date)}
                      colorScheme={selectedDate === date ? 'blue' : 'gray'}
                    >
                      {new Date(date).toLocaleDateString()}
                    </Button>
                  ))}
                </SimpleGrid>
              </VStack>
            </Box>
          )}

          {/* Time Slots */}
          {selectedDate && (
            <Box borderWidth={1} borderRadius="lg" p={4}>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Select Time Slot</Heading>
                {loading ? (
                  <VStack spacing={4}>
                    <Spinner size="md" />
                    <Text>Loading available slots...</Text>
                  </VStack>
                ) : availableSlots.length > 0 ? (
                  <SimpleGrid columns={[2, 3, 4]} spacing={4}>
                    {availableSlots.map((slot) => (
                      <Button
                        key={`${slot.startTime}-${slot.endTime}`}
                        onClick={() => setSelectedSlot(slot)}
                        colorScheme={selectedSlot === slot ? 'blue' : 'gray'}
                      >
                        {slot.startTime} - {slot.endTime}
                      </Button>
                    ))}
                  </SimpleGrid>
                ) : (
                  <Alert status="info">
                    <AlertIcon />
                    No available time slots for this date
                  </Alert>
                )}
              </VStack>
            </Box>
          )}

          {/* Book Button */}
          {selectedDoctor && selectedDate && selectedSlot && (
            <Button
              colorScheme="blue"
              size="lg"
              onClick={handleBookAppointment}
              isLoading={loading}
            >
              Book Appointment
            </Button>
          )}
        </VStack>
      </Box>
    </Layout>
  );
};

export default BookAppointment; 