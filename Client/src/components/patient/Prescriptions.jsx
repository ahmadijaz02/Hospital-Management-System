import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  VStack,
  HStack,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Spinner,
  Flex,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Collapse,
  useDisclosure
} from '@chakra-ui/react';
import { DownloadIcon, SearchIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import Layout from '../shared/Layout';
import axios from '../../utils/axios';

const Prescriptions = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen: isFilterOpen, onToggle: onFilterToggle } = useDisclosure();
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState([]);
  const [activePrescriptions, setActivePrescriptions] = useState([]);
  const [filteredActivePrescriptions, setFilteredActivePrescriptions] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [filters, setFilters] = useState({
    doctor: '',
    startDate: '',
    endDate: '',
    status: '',
    searchQuery: ''
  });

  useEffect(() => {
    fetchPrescriptions();
    fetchActivePrescriptions();
  }, []);

  // Apply filters whenever prescriptions or filters change
  useEffect(() => {
    applyFilters();
  }, [prescriptions, activePrescriptions, filters]);

  // Extract unique doctors from prescriptions
  useEffect(() => {
    if (prescriptions.length > 0) {
      const uniqueDoctors = Array.from(new Set(prescriptions.map(p => p.doctor._id)))
        .map(doctorId => {
          const prescription = prescriptions.find(p => p.doctor._id === doctorId);
          return {
            _id: doctorId,
            name: prescription.doctor.name
          };
        });
      setDoctors(uniqueDoctors);
    }
  }, [prescriptions]);
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const clearFilters = () => {
    setFilters({
      doctor: '',
      startDate: '',
      endDate: '',
      status: '',
      searchQuery: ''
    });
  };
  
  const applyFilters = () => {
    // Filter all prescriptions
    let filtered = [...prescriptions];
    
    if (filters.doctor) {
      filtered = filtered.filter(p => p.doctor._id === filters.doctor);
    }
    
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(p => new Date(p.createdAt) >= startDate);
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59); // End of the day
      filtered = filtered.filter(p => new Date(p.createdAt) <= endDate);
    }
    
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const query = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => 
        // Search in medications
        (p.medications && p.medications.some(med => 
          med.name.toLowerCase().includes(query) || 
          (med.dosage && med.dosage.toLowerCase().includes(query)) ||
          (med.frequency && med.frequency.toLowerCase().includes(query))
        )) ||
        // Search in diagnosis
        (p.diagnosis && p.diagnosis.toLowerCase().includes(query)) ||
        // Search in instructions
        (p.instructions && p.instructions.toLowerCase().includes(query)) ||
        // Search in doctor name
        (p.doctor.name && p.doctor.name.toLowerCase().includes(query))
      );
    }
    
    setFilteredPrescriptions(filtered);
    
    // Filter active prescriptions
    let filteredActive = [...activePrescriptions];
    
    if (filters.doctor) {
      filteredActive = filteredActive.filter(p => p.doctor._id === filters.doctor);
    }
    
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filteredActive = filteredActive.filter(p => new Date(p.createdAt) >= startDate);
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59); // End of the day
      filteredActive = filteredActive.filter(p => new Date(p.createdAt) <= endDate);
    }
    
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const query = filters.searchQuery.toLowerCase().trim();
      filteredActive = filteredActive.filter(p => 
        // Search in medications
        (p.medications && p.medications.some(med => 
          med.name.toLowerCase().includes(query) || 
          (med.dosage && med.dosage.toLowerCase().includes(query)) ||
          (med.frequency && med.frequency.toLowerCase().includes(query))
        )) ||
        // Search in diagnosis
        (p.diagnosis && p.diagnosis.toLowerCase().includes(query)) ||
        // Search in instructions
        (p.instructions && p.instructions.toLowerCase().includes(query)) ||
        // Search in doctor name
        (p.doctor.name && p.doctor.name.toLowerCase().includes(query))
      );
    }
    
    setFilteredActivePrescriptions(filteredActive);
  };

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      // Get the user from localStorage
      const user = JSON.parse(localStorage.getItem('user'));
      
      // Debug the user object
      console.log('User from localStorage:', user);
      
      // Check if user exists and has an id property
      if (!user || !user.id) {
        console.error('User ID not found in localStorage');
        toast({
          title: 'Error',
          description: 'User information not found. Please log in again.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      // Use the id property instead of _id
      const response = await axios.get(`/api/prescriptions/patient/${user.id}`);
      if (response.data.success) {
        const prescriptionsData = response.data.data;
        setPrescriptions(prescriptionsData);
        setFilteredPrescriptions(prescriptionsData);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch prescriptions',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchActivePrescriptions = async () => {
    try {
      // Get the user from localStorage
      const user = JSON.parse(localStorage.getItem('user'));
      
      // Check if user exists and has an id property
      if (!user || !user.id) {
        console.error('User ID not found in localStorage');
        return;
      }
      
      // Use the id property instead of _id
      const response = await axios.get(`/api/prescriptions/patient/${user.id}/active`);
      if (response.data.success) {
        const activePrescriptionsData = response.data.data;
        setActivePrescriptions(activePrescriptionsData);
        setFilteredActivePrescriptions(activePrescriptionsData);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch active prescriptions',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleViewPrescription = async (prescriptionId) => {
    try {
      setLoading(true);
      console.log('Viewing prescription with ID:', prescriptionId);
      
      // Add authorization headers explicitly
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/prescriptions/${prescriptionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Prescription response:', response.data);
      
      if (response.data.success) {
        setSelectedPrescription(response.data.data);
        setIsViewModalOpen(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch prescription details',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPrescription = async (prescriptionId) => {
    try {
      setLoading(true);
      console.log('Downloading prescription with ID:', prescriptionId);
      
      // Add authorization headers explicitly
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/prescriptions/${prescriptionId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Prescription download response:', response.data);
      
      if (response.data.success) {
        // Generate PDF on client side
        generatePDF(response.data.data);
        toast({
          title: 'Success',
          description: 'Prescription downloaded successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to download prescription',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Simple PDF generation function (in a real app, you'd use a library like jsPDF)
  const generatePDF = (data) => {
    // This is a placeholder. In a real application, you would use a library like jsPDF
    // to generate a proper PDF document
    const prescriptionText = `
      Hospital Management System
      Prescription
      
      Patient: ${data.patient.name}
      Doctor: ${data.doctor.name}
      Date: ${new Date(data.createdAt).toLocaleDateString()}
      
      Medications:
      ${data.medications.map(med => 
        `- ${med.name}: ${med.dosage}, ${med.frequency}, for ${med.duration}
         Instructions: ${med.instructions}`
      ).join('\n')}
      
      Notes: ${data.notes || 'None'}
      
      Expiry Date: ${new Date(data.expiryDate).toLocaleDateString()}
    `;
    
    // Create a Blob with the text content
    const blob = new Blob([prescriptionText], { type: 'text/plain' });
    
    // Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescription_${data._id}.txt`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'green';
      case 'completed':
        return 'blue';
      case 'cancelled':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Layout>
      <Box p={6}>
        <HStack justify="space-between" mb={4}>
          <Heading size="lg">My Prescriptions</Heading>
          <Button
            leftIcon={isFilterOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
            colorScheme="blue"
            variant="outline"
            onClick={onFilterToggle}
          >
            Filter
          </Button>
        </HStack>
        
        <Collapse in={isFilterOpen} animateOpacity>
          <Box p={4} mb={4} bg="white" borderRadius="md" shadow="sm">
            <FormControl mb={4}>
              <FormLabel>Search</FormLabel>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.300" />
                </InputLeftElement>
                <Input
                  placeholder="Search by medication, diagnosis, or doctor"
                  name="searchQuery"
                  value={filters.searchQuery}
                  onChange={handleFilterChange}
                />
              </InputGroup>
            </FormControl>
            <Grid templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(4, 1fr)" }} gap={4}>
              <GridItem>
                <FormControl>
                  <FormLabel>Doctor</FormLabel>
                  <Select 
                    name="doctor" 
                    value={filters.doctor} 
                    onChange={handleFilterChange}
                    placeholder="All Doctors"
                  >
                    {doctors.map(doctor => (
                      <option key={doctor._id} value={doctor._id}>{doctor.name}</option>
                    ))}
                  </Select>
                </FormControl>
              </GridItem>
              <GridItem>
                <FormControl>
                  <FormLabel>Start Date</FormLabel>
                  <Input 
                    type="date" 
                    name="startDate" 
                    value={filters.startDate} 
                    onChange={handleFilterChange}
                  />
                </FormControl>
              </GridItem>
              <GridItem>
                <FormControl>
                  <FormLabel>End Date</FormLabel>
                  <Input 
                    type="date" 
                    name="endDate" 
                    value={filters.endDate} 
                    onChange={handleFilterChange}
                  />
                </FormControl>
              </GridItem>
              <GridItem>
                <FormControl>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    name="status" 
                    value={filters.status} 
                    onChange={handleFilterChange}
                    placeholder="All Status"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </Select>
                </FormControl>
              </GridItem>
            </Grid>
            <HStack mt={4} justify="flex-end">
              <Button size="sm" onClick={clearFilters}>Clear Filters</Button>
            </HStack>
          </Box>
        </Collapse>

        <Tabs isFitted variant="enclosed" colorScheme="blue">
          <TabList mb="1em">
            <Tab>Active Prescriptions</Tab>
            <Tab>All Prescriptions</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Box bg="white" p={6} borderRadius="lg" shadow="sm">
                <Heading size="md" mb={4}>
                  Current Medications
                </Heading>
                {loading ? (
                  <Flex justify="center" align="center" h="200px">
                    <Spinner size="xl" />
                  </Flex>
                ) : filteredActivePrescriptions.length > 0 ? (
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Date</Th>
                        <Th>Doctor</Th>
                        <Th>Expires</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredActivePrescriptions.map((prescription) => (
                        <Tr key={prescription._id}>
                          <Td>{formatDate(prescription.createdAt)}</Td>
                          <Td>{prescription.doctor.name}</Td>
                          <Td>{formatDate(prescription.expiryDate)}</Td>
                          <Td>
                            <HStack spacing={2}>
                              <Button size="sm" colorScheme="blue" onClick={() => handleViewPrescription(prescription._id)}>
                                View
                              </Button>
                              <IconButton
                                size="sm"
                                colorScheme="green"
                                icon={<DownloadIcon />}
                                onClick={() => handleDownloadPrescription(prescription._id)}
                                aria-label="Download prescription"
                              />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                ) : (
                  <Text>No active prescriptions found</Text>
                )}
              </Box>
            </TabPanel>
            <TabPanel>
              <Box bg="white" p={6} borderRadius="lg" shadow="sm">
                <Heading size="md" mb={4}>
                  Prescription History
                </Heading>
                {loading ? (
                  <Flex justify="center" align="center" h="200px">
                    <Spinner size="xl" />
                  </Flex>
                ) : filteredPrescriptions.length > 0 ? (
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Date</Th>
                        <Th>Doctor</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredPrescriptions.map((prescription) => (
                        <Tr key={prescription._id}>
                          <Td>{formatDate(prescription.createdAt)}</Td>
                          <Td>{prescription.doctor.name}</Td>
                          <Td>
                            <Badge colorScheme={getStatusColor(prescription.status)}>
                              {prescription.status}
                            </Badge>
                          </Td>
                          <Td>
                            <HStack spacing={2}>
                              <Button size="sm" colorScheme="blue" onClick={() => handleViewPrescription(prescription._id)}>
                                View
                              </Button>
                              <IconButton
                                size="sm"
                                colorScheme="green"
                                icon={<DownloadIcon />}
                                onClick={() => handleDownloadPrescription(prescription._id)}
                                aria-label="Download prescription"
                              />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                ) : (
                  <Text>No prescriptions found</Text>
                )}
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* View Prescription Modal */}
        <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Prescription Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedPrescription && (
                <VStack spacing={4} align="stretch">
                  <Box p={4} bg="gray.50" borderRadius="md">
                    <Heading size="sm" mb={2}>Doctor Information</Heading>
                    <Text><strong>Name:</strong> {selectedPrescription.doctor.name}</Text>
                    <Text><strong>Email:</strong> {selectedPrescription.doctor.email}</Text>
                  </Box>

                  <Box p={4} bg="gray.50" borderRadius="md">
                    <Heading size="sm" mb={2}>Prescription Details</Heading>
                    <Text><strong>Created:</strong> {formatDate(selectedPrescription.createdAt)}</Text>
                    <Text><strong>Expires:</strong> {formatDate(selectedPrescription.expiryDate)}</Text>
                    <Text>
                      <strong>Status:</strong>{' '}
                      <Badge colorScheme={getStatusColor(selectedPrescription.status)}>
                        {selectedPrescription.status}
                      </Badge>
                    </Text>
                  </Box>

                  <Box p={4} bg="gray.50" borderRadius="md">
                    <Heading size="sm" mb={2}>Medications</Heading>
                    {selectedPrescription.medications.map((med, index) => (
                      <Box key={index} p={3} mb={2} borderWidth="1px" borderRadius="md" bg="white">
                        <Text fontWeight="bold">{med.name}</Text>
                        <Text><strong>Dosage:</strong> {med.dosage}</Text>
                        <Text><strong>Frequency:</strong> {med.frequency}</Text>
                        <Text><strong>Duration:</strong> {med.duration}</Text>
                        {med.instructions && (
                          <Text><strong>Instructions:</strong> {med.instructions}</Text>
                        )}
                      </Box>
                    ))}
                  </Box>

                  {selectedPrescription.notes && (
                    <Box p={4} bg="gray.50" borderRadius="md">
                      <Heading size="sm" mb={2}>Notes</Heading>
                      <Text>{selectedPrescription.notes}</Text>
                    </Box>
                  )}
                </VStack>
              )}
            </ModalBody>
            <ModalFooter>
              <Button 
                colorScheme="green" 
                leftIcon={<DownloadIcon />} 
                mr={3}
                onClick={() => handleDownloadPrescription(selectedPrescription._id)}
              >
                Download
              </Button>
              <Button colorScheme="blue" onClick={() => setIsViewModalOpen(false)}>
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </Layout>
  );
};

export default Prescriptions;
