import React, { useState, useEffect, useRef } from 'react';
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
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  SimpleGrid,
  Spinner,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Flex,
  IconButton,
  Divider,
  InputGroup,
  InputLeftElement,
  Collapse,
  useDisclosure,
  List,
  ListItem,
  Tag,
  TagLabel,
  TagCloseButton
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, DownloadIcon, SearchIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { FaFilter, FaCalendarAlt, FaUser, FaPills } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Layout from '../shared/Layout';
import axios from '../../utils/axios';

const PrescriptionManagement = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen: isFilterOpen, onToggle: onFilterToggle } = useDisclosure();
  const searchInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    patient: '',
    status: '',
    startDate: '',
    endDate: '',
    searchQuery: ''
  });

  // Search suggestions state
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [formData, setFormData] = useState({
    patient: '',
    medicalRecord: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    notes: '',
    expiryDate: ''
  });

  useEffect(() => {
    fetchPrescriptions();
    fetchPatients();
    fetchMedicalRecords();
  }, []);

  // Apply filters whenever prescriptions or filters change
  useEffect(() => {
    if (prescriptions.length > 0) {
      applyFilters();
    }
  }, [prescriptions, filters]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle search input with real-time suggestions
  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setFilters(prev => ({
      ...prev,
      searchQuery: query
    }));

    if (query.trim().length > 1) {
      // Generate suggestions based on medications, patient names, and statuses
      const medicationSuggestions = Array.from(new Set(
        prescriptions.flatMap(p =>
          p.medications.map(med => med.name)
        )
      )).filter(name =>
        name.toLowerCase().includes(query.toLowerCase())
      ).map(name => ({ type: 'medication', value: name }));

      const patientSuggestions = Array.from(new Set(
        prescriptions.map(p => p.patient?.name).filter(Boolean)
      )).filter(name =>
        name.toLowerCase().includes(query.toLowerCase())
      ).map(name => ({ type: 'patient', value: name }));

      const statusSuggestions = ['active', 'completed', 'cancelled']
        .filter(status => status.includes(query.toLowerCase()))
        .map(status => ({ type: 'status', value: status }));

      // Combine and limit suggestions
      const allSuggestions = [...medicationSuggestions, ...patientSuggestions, ...statusSuggestions]
        .slice(0, 10);

      setSearchSuggestions(allSuggestions);
      setShowSuggestions(allSuggestions.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion) => {
    setFilters(prev => ({
      ...prev,
      searchQuery: suggestion.value
    }));
    setShowSuggestions(false);

    // If it's a patient suggestion, also set the patient filter
    if (suggestion.type === 'patient') {
      const patient = patients.find(p => p.name === suggestion.value);
      if (patient) {
        setFilters(prev => ({
          ...prev,
          patient: patient._id
        }));
      }
    }

    // If it's a status suggestion, also set the status filter
    if (suggestion.type === 'status') {
      setFilters(prev => ({
        ...prev,
        status: suggestion.value
      }));
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      patient: '',
      status: '',
      startDate: '',
      endDate: '',
      searchQuery: ''
    });
  };

  // Apply filters to prescriptions
  const applyFilters = () => {
    let filtered = [...prescriptions];

    // Filter by patient
    if (filters.patient) {
      filtered = filtered.filter(p =>
        p.patient && p.patient._id === filters.patient
      );
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(p =>
        p.status.toLowerCase() === filters.status.toLowerCase()
      );
    }

    // Filter by date range - start date
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(p =>
        new Date(p.createdAt) >= startDate
      );
    }

    // Filter by date range - end date
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p =>
        new Date(p.createdAt) <= endDate
      );
    }

    // Filter by search query
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const query = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        // Search in patient name
        (p.patient && p.patient.name && p.patient.name.toLowerCase().includes(query)) ||
        // Search in medications
        (p.medications && p.medications.some(med =>
          med.name.toLowerCase().includes(query) ||
          (med.dosage && med.dosage.toLowerCase().includes(query)) ||
          (med.frequency && med.frequency.toLowerCase().includes(query)) ||
          (med.instructions && med.instructions.toLowerCase().includes(query))
        )) ||
        // Search in notes
        (p.notes && p.notes.toLowerCase().includes(query)) ||
        // Search in status
        p.status.toLowerCase().includes(query)
      );
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setFilteredPrescriptions(filtered);
  };

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/prescriptions/doctor/prescriptions');
      console.log('Prescriptions response:', response.data);

      if (response.data.success) {
        // Check for any prescriptions with missing patient data
        const prescriptionsData = response.data.data;
        const invalidPrescriptions = prescriptionsData.filter(p => !p.patient || !p.patient.name);

        if (invalidPrescriptions.length > 0) {
          console.warn('Found prescriptions with missing patient data:', invalidPrescriptions);
        }

        // Sort by creation date (newest first)
        prescriptionsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setPrescriptions(prescriptionsData);
        setFilteredPrescriptions(prescriptionsData);
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch prescriptions',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setPrescriptions([]);
      setFilteredPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      console.log('Fetching patients...');
      const response = await axios.get('/api/users/patients');
      console.log('Patients response:', response.data);
      if (response.data.success) {
        setPatients(response.data.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch patients',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const fetchMedicalRecords = async () => {
    try {
      const response = await axios.get('/api/medical-records/doctor/records');
      if (response.data.success) {
        setMedicalRecords(response.data.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch medical records',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleViewPrescription = async (prescriptionId) => {
    try {
      setLoading(true);
      console.log('Doctor viewing prescription with ID:', prescriptionId);

      // Add authorization headers explicitly
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/prescriptions/${prescriptionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Prescription response:', response.data);

      if (response.data.success) {
        const prescriptionData = response.data.data;

        // Check if patient data is missing
        if (!prescriptionData.patient) {
          console.warn('Prescription has missing patient data:', prescriptionData);
          // Add a placeholder patient object to prevent errors
          prescriptionData.patient = { name: 'Unknown Patient', email: 'N/A' };
        }

        setSelectedPrescription(prescriptionData);
        setIsViewModalOpen(true);
      }
    } catch (error) {
      console.error('Error viewing prescription:', error);
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

  // Download functionality has been moved to the patient side only

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleMedicationChange = (index, field, value) => {
    const updatedMedications = [...formData.medications];
    updatedMedications[index][field] = value;
    setFormData({
      ...formData,
      medications: updatedMedications
    });
  };

  const addMedication = () => {
    setFormData({
      ...formData,
      medications: [
        ...formData.medications,
        { name: '', dosage: '', frequency: '', duration: '', instructions: '' }
      ]
    });
  };

  const removeMedication = (index) => {
    const updatedMedications = [...formData.medications];
    updatedMedications.splice(index, 1);
    setFormData({
      ...formData,
      medications: updatedMedications
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Calculate expiry date if not provided (default to 30 days from now)
      let expiryDate = formData.expiryDate;
      if (!expiryDate) {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        expiryDate = date.toISOString().split('T')[0];
      }

      const payload = {
        ...formData,
        expiryDate
      };

      const response = await axios.post('/api/prescriptions', payload);
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Prescription created successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setIsCreateModalOpen(false);
        fetchPrescriptions();
        // Reset form
        setFormData({
          patient: '',
          medicalRecord: '',
          medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
          notes: '',
          expiryDate: ''
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create prescription',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
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
        <HStack justify="space-between" mb={6}>
          <Heading size="lg">Prescription Management</Heading>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create New Prescription
          </Button>
        </HStack>

        <Box bg="white" p={6} borderRadius="lg" shadow="sm">
          <HStack justify="space-between" mb={4}>
            <Heading size="md">Prescriptions</Heading>
            <Button
              leftIcon={isFilterOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
              rightIcon={<FaFilter />}
              colorScheme="blue"
              variant="outline"
              size="sm"
              onClick={onFilterToggle}
            >
              {isFilterOpen ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </HStack>

          {/* Filter Panel */}
          <Collapse in={isFilterOpen} animateOpacity>
            <Box p={4} mb={4} bg="gray.50" borderRadius="md">
              <VStack spacing={4} align="stretch">
                {/* Search with real-time suggestions */}
                <FormControl position="relative">
                  <FormLabel>Search</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <SearchIcon color="gray.300" />
                    </InputLeftElement>
                    <Input
                      ref={searchInputRef}
                      placeholder="Search by medication, patient, or status..."
                      value={filters.searchQuery}
                      onChange={handleSearchInputChange}
                      onFocus={() => {
                        if (filters.searchQuery.trim().length > 1) {
                          setShowSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding suggestions to allow for clicks
                        setTimeout(() => setShowSuggestions(false), 200);
                      }}
                    />
                  </InputGroup>

                  {/* Search suggestions dropdown */}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <List
                      position="absolute"
                      zIndex={10}
                      bg="white"
                      width="100%"
                      borderWidth="1px"
                      borderRadius="md"
                      boxShadow="md"
                      mt={1}
                      maxH="200px"
                      overflowY="auto"
                    >
                      {searchSuggestions.map((suggestion, index) => (
                        <ListItem
                          key={`${suggestion.type}-${suggestion.value}-${index}`}
                          p={2}
                          cursor="pointer"
                          _hover={{ bg: "blue.50" }}
                          onClick={() => handleSelectSuggestion(suggestion)}
                        >
                          <HStack>
                            <Box color="blue.500">
                              {suggestion.type === 'medication' && <FaPills />}
                              {suggestion.type === 'patient' && <FaUser />}
                              {suggestion.type === 'status' && <Badge colorScheme={getStatusColor(suggestion.value)}>{suggestion.value}</Badge>}
                            </Box>
                            <Text>{suggestion.value}</Text>
                            <Text fontSize="xs" color="gray.500">
                              ({suggestion.type})
                            </Text>
                          </HStack>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </FormControl>

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  {/* Patient Filter */}
                  <FormControl>
                    <FormLabel>Patient</FormLabel>
                    <Select
                      name="patient"
                      value={filters.patient}
                      onChange={handleFilterChange}
                      placeholder="All Patients"
                    >
                      {patients.map(patient => (
                        <option key={patient._id} value={patient._id}>{patient.name}</option>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Status Filter */}
                  <FormControl>
                    <FormLabel>Status</FormLabel>
                    <Select
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                      placeholder="All Status"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </Select>
                  </FormControl>

                  {/* Date Range Filter */}
                  <FormControl>
                    <FormLabel>Date Range</FormLabel>
                    <HStack>
                      <Input
                        type="date"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleFilterChange}
                        placeholder="From"
                        size="md"
                      />
                      <Text>to</Text>
                      <Input
                        type="date"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleFilterChange}
                        placeholder="To"
                        size="md"
                      />
                    </HStack>
                  </FormControl>
                </SimpleGrid>

                {/* Filter Actions */}
                <HStack justify="flex-end">
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="outline"
                    onClick={resetFilters}
                  >
                    Reset Filters
                  </Button>
                </HStack>

                {/* Active Filters Display */}
                {(filters.patient || filters.status || filters.startDate || filters.endDate || filters.searchQuery) && (
                  <Box>
                    <Divider my={2} />
                    <HStack spacing={2} wrap="wrap">
                      <Text fontSize="sm" fontWeight="medium">Active Filters:</Text>

                      {filters.patient && (
                        <Tag size="md" colorScheme="blue" borderRadius="full">
                          <TagLabel>
                            Patient: {patients.find(p => p._id === filters.patient)?.name || 'Unknown'}
                          </TagLabel>
                          <TagCloseButton onClick={() => setFilters(prev => ({ ...prev, patient: '' }))} />
                        </Tag>
                      )}

                      {filters.status && (
                        <Tag size="md" colorScheme={getStatusColor(filters.status)} borderRadius="full">
                          <TagLabel>Status: {filters.status}</TagLabel>
                          <TagCloseButton onClick={() => setFilters(prev => ({ ...prev, status: '' }))} />
                        </Tag>
                      )}

                      {filters.startDate && (
                        <Tag size="md" colorScheme="purple" borderRadius="full">
                          <TagLabel>From: {filters.startDate}</TagLabel>
                          <TagCloseButton onClick={() => setFilters(prev => ({ ...prev, startDate: '' }))} />
                        </Tag>
                      )}

                      {filters.endDate && (
                        <Tag size="md" colorScheme="purple" borderRadius="full">
                          <TagLabel>To: {filters.endDate}</TagLabel>
                          <TagCloseButton onClick={() => setFilters(prev => ({ ...prev, endDate: '' }))} />
                        </Tag>
                      )}

                      {filters.searchQuery && (
                        <Tag size="md" colorScheme="green" borderRadius="full">
                          <TagLabel>Search: {filters.searchQuery}</TagLabel>
                          <TagCloseButton onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))} />
                        </Tag>
                      )}
                    </HStack>
                  </Box>
                )}
              </VStack>
            </Box>
          </Collapse>

          {/* Results Count */}
          {!loading && prescriptions.length > 0 && (
            <HStack mb={4} justify="space-between">
              <Text fontSize="sm" color="gray.600">
                Showing {filteredPrescriptions.length} of {prescriptions.length} prescriptions
              </Text>

              {filteredPrescriptions.length < prescriptions.length && (
                <Button
                  size="xs"
                  variant="link"
                  colorScheme="red"
                  onClick={resetFilters}
                >
                  Clear All Filters
                </Button>
              )}
            </HStack>
          )}

          {loading ? (
            <Flex justify="center" align="center" h="200px">
              <Spinner size="xl" />
            </Flex>
          ) : filteredPrescriptions.length > 0 ? (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Patient</Th>
                  <Th>Created Date</Th>
                  <Th>Expiry Date</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredPrescriptions.map((prescription) => (
                  <Tr key={prescription._id}>
                    <Td>{prescription.patient && prescription.patient.name ? prescription.patient.name : 'Unknown Patient'}</Td>
                    <Td>{formatDate(prescription.createdAt)}</Td>
                    <Td>{formatDate(prescription.expiryDate)}</Td>
                    <Td>
                      <Badge colorScheme={getStatusColor(prescription.status)}>
                        {prescription.status}
                      </Badge>
                    </Td>
                    <Td>
                      <Button size="sm" colorScheme="blue" onClick={() => handleViewPrescription(prescription._id)}>
                        View Details
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <Box p={8} textAlign="center" bg="gray.50" borderRadius="md">
              <Text fontSize="lg" color="gray.600">
                No prescriptions found
                {(filters.patient || filters.status || filters.startDate || filters.endDate || filters.searchQuery) && ' matching your filters'}
              </Text>
              {(filters.patient || filters.status || filters.startDate || filters.endDate || filters.searchQuery) && (
                <Button
                  mt={4}
                  colorScheme="blue"
                  size="sm"
                  onClick={resetFilters}
                >
                  Clear Filters
                </Button>
              )}
            </Box>
          )}
        </Box>

        {/* Create Prescription Modal */}
        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Create New Prescription</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <FormControl isRequired>
                  <FormLabel>Patient</FormLabel>
                  <Select
                    name="patient"
                    value={formData.patient}
                    onChange={handleInputChange}
                    placeholder="Select patient"
                  >
                    {patients.map(patient => (
                      <option key={patient._id} value={patient._id}>
                        {patient.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Medical Record (Optional)</FormLabel>
                  <Select
                    name="medicalRecord"
                    value={formData.medicalRecord}
                    onChange={handleInputChange}
                    placeholder="Select related medical record"
                  >
                    {medicalRecords
                      .filter(record => record.patient._id === formData.patient)
                      .map(record => (
                        <option key={record._id} value={record._id}>
                          {formatDate(record.createdAt)} - {record.diagnosis.substring(0, 30)}...
                        </option>
                      ))}
                  </Select>
                </FormControl>

                <Divider my={2} />
                <Heading size="sm">Medications</Heading>

                {formData.medications.map((medication, index) => (
                  <Box key={index} p={3} borderWidth="1px" borderRadius="md">
                    <HStack justify="space-between" mb={2}>
                      <Text fontWeight="bold">Medication #{index + 1}</Text>
                      {index > 0 && (
                        <IconButton
                          size="sm"
                          colorScheme="red"
                          icon={<DeleteIcon />}
                          onClick={() => removeMedication(index)}
                          aria-label="Remove medication"
                        />
                      )}
                    </HStack>
                    <SimpleGrid columns={2} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel>Name</FormLabel>
                        <Input
                          value={medication.name}
                          onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                          placeholder="Medication name"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel>Dosage</FormLabel>
                        <Input
                          value={medication.dosage}
                          onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                          placeholder="e.g., 500mg"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel>Frequency</FormLabel>
                        <Input
                          value={medication.frequency}
                          onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                          placeholder="e.g., Twice daily"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel>Duration</FormLabel>
                        <Input
                          value={medication.duration}
                          onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                          placeholder="e.g., 7 days"
                        />
                      </FormControl>
                    </SimpleGrid>
                    <FormControl mt={2}>
                      <FormLabel>Instructions</FormLabel>
                      <Textarea
                        value={medication.instructions}
                        onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)}
                        placeholder="Special instructions"
                      />
                    </FormControl>
                  </Box>
                ))}

                <Button leftIcon={<AddIcon />} onClick={addMedication} colorScheme="blue" variant="outline">
                  Add Another Medication
                </Button>

                <FormControl>
                  <FormLabel>Notes</FormLabel>
                  <Textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Additional notes"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Expiry Date</FormLabel>
                  <Input
                    name="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    placeholder="Select expiry date"
                  />
                  <Text fontSize="sm" color="gray.500">
                    If not specified, prescription will expire in 30 days
                  </Text>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={handleSubmit} isLoading={loading}>
                Save Prescription
              </Button>
              <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

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
                    <Heading size="sm" mb={2}>Patient Information</Heading>
                    {selectedPrescription.patient ? (
                      <>
                        <Text><strong>Name:</strong> {selectedPrescription.patient.name || 'N/A'}</Text>
                        <Text><strong>Email:</strong> {selectedPrescription.patient.email || 'N/A'}</Text>
                      </>
                    ) : (
                      <Text>Patient information not available</Text>
                    )}
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

export default PrescriptionManagement;
