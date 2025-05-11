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
  Flex
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import Layout from '../shared/Layout';
import axios from '../../utils/axios';

const MedicalRecordManagement = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewMode, setViewMode] = useState('patients'); // 'patients' or 'records'
  const [formData, setFormData] = useState({
    diagnosis: '',
    symptoms: '',
    notes: '',
    vitalSigns: {
      temperature: '',
      bloodPressure: '',
      heartRate: '',
      respiratoryRate: ''
    }
  });

  useEffect(() => {
    fetchAppointments();
    fetchMedicalRecords();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/appointments/doctor-appointments');
      if (response.data.success) {
        // The backend now filters out appointments that already have medical records
        // We just need to filter for completed appointments
        setAppointments(response.data.appointments.filter(
          apt => apt.status.toLowerCase() === 'completed'
        ));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch appointments',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/medical-records/doctor/records');
      if (response.data.success) {
        const records = response.data.data;
        setMedicalRecords(records);
        
        // Extract unique patients from the medical records
        const uniquePatients = [];
        const patientMap = new Map();
        
        records.forEach(record => {
          if (record.patient && record.patient._id && !patientMap.has(record.patient._id)) {
            patientMap.set(record.patient._id, true);
            uniquePatients.push({
              _id: record.patient._id,
              id: record.patient.id,
              name: record.patient.name,
              email: record.patient.email,
              recordCount: 1
            });
          } else if (record.patient && record.patient._id) {
            // Increment record count for this patient
            const patientIndex = uniquePatients.findIndex(p => 
              p._id === record.patient._id || p.id === record.patient._id
            );
            if (patientIndex !== -1) {
              uniquePatients[patientIndex].recordCount += 1;
            }
          }
        });
        
        // Sort patients by name
        uniquePatients.sort((a, b) => a.name.localeCompare(b.name));
        setPatients(uniquePatients);
        console.log('Unique patients:', uniquePatients);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch medical records',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecord = (appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    // Filter medical records for this patient
    const patientRecords = medicalRecords.filter(record => 
      (record.patient._id === patient._id) || (record.patient.id === patient._id)
    );
    setFilteredRecords(patientRecords);
    setViewMode('records');
  };
  
  const handleBackToPatients = () => {
    setSelectedPatient(null);
    setFilteredRecords([]);
    setViewMode('patients');
  };

  const handleViewRecord = async (recordId) => {
    try {
      setLoading(true);
      console.log('Doctor viewing medical record with ID:', recordId);
      
      // Add authorization headers explicitly
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/medical-records/${recordId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Medical record response:', response.data);
      
      if (response.data.success) {
        setSelectedRecord(response.data.data);
        setIsViewModalOpen(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch medical record details',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const payload = {
        ...formData,
        patient: selectedAppointment.patient._id,
        appointment: selectedAppointment._id
      };

      const response = await axios.post('/api/medical-records', payload);
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Medical record created successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setIsModalOpen(false);
        fetchMedicalRecords();
        fetchAppointments();
        // Reset form
        setFormData({
          diagnosis: '',
          symptoms: '',
          notes: '',
          vitalSigns: {
            temperature: '',
            bloodPressure: '',
            heartRate: '',
            respiratoryRate: ''
          }
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create medical record',
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

  return (
    <Layout>
      <Box p={6}>
        <HStack justify="space-between" mb={6}>
          <Heading size="lg">Medical Records Management</Heading>
        </HStack>

        <Tabs isFitted variant="enclosed" colorScheme="blue">
          <TabList mb="1em">
            <Tab>Medical Records</Tab>
            <Tab>Create New Record</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Box bg="white" p={6} borderRadius="lg" shadow="sm">
                {viewMode === 'patients' ? (
                  /* Patient List View */
                  <>
                    <Heading size="md" mb={4}>
                      Patients with Medical Records
                    </Heading>
                    {loading ? (
                      <Flex justify="center" align="center" h="200px">
                        <Spinner size="xl" />
                      </Flex>
                    ) : patients.length > 0 ? (
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Patient Name</Th>
                            <Th>Email</Th>
                            <Th>Medical Records</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {patients.map((patient) => (
                            <Tr key={patient._id}>
                              <Td>{patient.name}</Td>
                              <Td>{patient.email}</Td>
                              <Td>
                                <Badge colorScheme="blue">{patient.recordCount}</Badge>
                              </Td>
                              <Td>
                                <Button size="sm" colorScheme="blue" onClick={() => handlePatientSelect(patient)}>
                                  View Records
                                </Button>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    ) : (
                      <Text>No patients with medical records found</Text>
                    )}
                  </>
                ) : (
                  /* Patient Medical Records View */
                  <>
                    <HStack justify="space-between" mb={4}>
                      <Heading size="md">
                        Medical Records for {selectedPatient?.name}
                      </Heading>
                      <Button size="sm" leftIcon={<ArrowBackIcon />} onClick={handleBackToPatients}>
                        Back to Patients
                      </Button>
                    </HStack>
                    
                    {loading ? (
                      <Flex justify="center" align="center" h="200px">
                        <Spinner size="xl" />
                      </Flex>
                    ) : filteredRecords.length > 0 ? (
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Date</Th>
                            <Th>Diagnosis</Th>
                            <Th>Created By</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {filteredRecords.map((record) => {
                            // Check if this record was created by the current doctor
                            const currentUser = JSON.parse(localStorage.getItem('user'));
                            const currentUserId = currentUser?.id;
                            const isCurrentDoctorRecord = record.doctor._id === currentUserId || 
                                                        record.doctor.id === currentUserId;
                            
                            return (
                              <Tr key={record._id} bg={isCurrentDoctorRecord ? 'blue.50' : 'white'}>
                                <Td>{formatDate(record.createdAt)}</Td>
                                <Td>{record.diagnosis.substring(0, 30)}...</Td>
                                <Td>
                                  {isCurrentDoctorRecord ? 
                                    <Badge colorScheme="blue">You</Badge> : 
                                    <Text>{record.doctor.name || 'Another Doctor'}</Text>
                                  }
                                </Td>
                                <Td>
                                  <Button size="sm" colorScheme="blue" onClick={() => handleViewRecord(record._id)}>
                                    View Details
                                  </Button>
                                </Td>
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    ) : (
                      <Text>No medical records found for this patient</Text>
                    )}
                  </>
                )}
              </Box>
            </TabPanel>
            <TabPanel>
              <Box bg="white" p={6} borderRadius="lg" shadow="sm">
                <Heading size="md" mb={4}>
                  Completed Appointments Without Records
                </Heading>
                {loading ? (
                  <Flex justify="center" align="center" h="200px">
                    <Spinner size="xl" />
                  </Flex>
                ) : appointments.length > 0 ? (
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Patient</Th>
                        <Th>Date</Th>
                        <Th>Time</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {appointments.map((appointment) => (
                        <Tr key={appointment._id}>
                          <Td>{appointment.patient.name}</Td>
                          <Td>{formatDate(appointment.date)}</Td>
                          <Td>{appointment.time}</Td>
                          <Td>
                            <Button size="sm" colorScheme="green" onClick={() => handleCreateRecord(appointment)}>
                              Create Record
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                ) : (
                  <Text>No completed appointments without records found</Text>
                )}
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Create Medical Record Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Create Medical Record</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedAppointment && (
                <VStack spacing={4} align="stretch">
                  <Text>
                    <strong>Patient:</strong> {selectedAppointment.patient.name}
                  </Text>
                  <Text>
                    <strong>Date:</strong> {formatDate(selectedAppointment.date)}
                  </Text>
                  <Text>
                    <strong>Time:</strong> {selectedAppointment.time}
                  </Text>

                  <FormControl isRequired>
                    <FormLabel>Diagnosis</FormLabel>
                    <Textarea
                      name="diagnosis"
                      value={formData.diagnosis}
                      onChange={handleInputChange}
                      placeholder="Enter diagnosis"
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Symptoms</FormLabel>
                    <Textarea
                      name="symptoms"
                      value={formData.symptoms}
                      onChange={handleInputChange}
                      placeholder="Enter symptoms"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Notes</FormLabel>
                    <Textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Enter additional notes"
                    />
                  </FormControl>

                  <Heading size="sm" mt={2}>Vital Signs</Heading>
                  <SimpleGrid columns={2} spacing={4}>
                    <FormControl>
                      <FormLabel>Temperature</FormLabel>
                      <Input
                        name="vitalSigns.temperature"
                        value={formData.vitalSigns.temperature}
                        onChange={handleInputChange}
                        placeholder="e.g., 98.6°F"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Blood Pressure</FormLabel>
                      <Input
                        name="vitalSigns.bloodPressure"
                        value={formData.vitalSigns.bloodPressure}
                        onChange={handleInputChange}
                        placeholder="e.g., 120/80 mmHg"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Heart Rate</FormLabel>
                      <Input
                        name="vitalSigns.heartRate"
                        value={formData.vitalSigns.heartRate}
                        onChange={handleInputChange}
                        placeholder="e.g., 72 bpm"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Respiratory Rate</FormLabel>
                      <Input
                        name="vitalSigns.respiratoryRate"
                        value={formData.vitalSigns.respiratoryRate}
                        onChange={handleInputChange}
                        placeholder="e.g., 16 breaths/min"
                      />
                    </FormControl>
                  </SimpleGrid>
                </VStack>
              )}
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={handleSubmit} isLoading={loading}>
                Save Record
              </Button>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* View Medical Record Modal */}
        <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Medical Record Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedRecord && (
                <VStack spacing={4} align="stretch">
                  <Box p={4} bg="gray.50" borderRadius="md">
                    <Heading size="sm" mb={2}>Patient Information</Heading>
                    <Text><strong>Name:</strong> {selectedRecord.patient.name}</Text>
                    <Text><strong>Email:</strong> {selectedRecord.patient.email}</Text>
                  </Box>

                  <Box p={4} bg="gray.50" borderRadius="md">
                    <Heading size="sm" mb={2}>Appointment Details</Heading>
                    <Text><strong>Date:</strong> {formatDate(selectedRecord.appointment.date)}</Text>
                    <Text><strong>Time:</strong> {selectedRecord.appointment.time}</Text>
                  </Box>

                  <Box p={4} bg="gray.50" borderRadius="md">
                    <Heading size="sm" mb={2}>Medical Information</Heading>
                    <Text><strong>Diagnosis:</strong> {selectedRecord.diagnosis}</Text>
                    <Text><strong>Symptoms:</strong> {selectedRecord.symptoms}</Text>
                    {selectedRecord.notes && (
                      <Text><strong>Notes:</strong> {selectedRecord.notes}</Text>
                    )}
                  </Box>

                  {selectedRecord.vitalSigns && (
                    <Box p={4} bg="gray.50" borderRadius="md">
                      <Heading size="sm" mb={2}>Vital Signs</Heading>
                      {selectedRecord.vitalSigns.temperature && (
                        <Text><strong>Temperature:</strong> {selectedRecord.vitalSigns.temperature}</Text>
                      )}
                      {selectedRecord.vitalSigns.bloodPressure && (
                        <Text><strong>Blood Pressure:</strong> {selectedRecord.vitalSigns.bloodPressure}</Text>
                      )}
                      {selectedRecord.vitalSigns.heartRate && (
                        <Text><strong>Heart Rate:</strong> {selectedRecord.vitalSigns.heartRate}</Text>
                      )}
                      {selectedRecord.vitalSigns.respiratoryRate && (
                        <Text><strong>Respiratory Rate:</strong> {selectedRecord.vitalSigns.respiratoryRate}</Text>
                      )}
                    </Box>
                  )}

                  <Box p={4} bg="gray.50" borderRadius="md">
                    <Heading size="sm" mb={2}>Record Information</Heading>
                    <Text><strong>Created:</strong> {formatDate(selectedRecord.createdAt)}</Text>
                    <Text><strong>Last Updated:</strong> {formatDate(selectedRecord.updatedAt)}</Text>
                  </Box>
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

export default MedicalRecordManagement;
