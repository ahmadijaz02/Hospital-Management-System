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
  Divider
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import Layout from '../shared/Layout';
import axios from '../../utils/axios';

const MedicalRecords = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    fetchMedicalRecords();
  }, []);

  const fetchMedicalRecords = async () => {
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
      const response = await axios.get(`/api/medical-records/patient/${user.id}`);
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
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecord = async (recordId) => {
    try {
      setLoading(true);
      console.log('Viewing medical record with ID:', recordId);
      
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <Layout>
      <Box p={6}>
        <HStack justify="space-between" mb={6}>
          <Heading size="lg">My Medical Records</Heading>
        </HStack>

        <Box bg="white" p={6} borderRadius="lg" shadow="sm">
          <Heading size="md" mb={4}>
            Medical History
          </Heading>
          {loading ? (
            <Flex justify="center" align="center" h="200px">
              <Spinner size="xl" />
            </Flex>
          ) : medicalRecords.length > 0 ? (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Doctor</Th>
                  <Th>Diagnosis</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {medicalRecords.map((record) => (
                  <Tr key={record._id}>
                    <Td>{formatDate(record.createdAt)}</Td>
                    <Td>{record.doctor.name}</Td>
                    <Td>{record.diagnosis.substring(0, 30)}...</Td>
                    <Td>
                      <Button size="sm" colorScheme="blue" onClick={() => handleViewRecord(record._id)}>
                        View Details
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <Text>No medical records found</Text>
          )}
        </Box>

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
                    <Heading size="sm" mb={2}>Doctor Information</Heading>
                    <Text><strong>Name:</strong> {selectedRecord.doctor.name}</Text>
                    <Text><strong>Email:</strong> {selectedRecord.doctor.email}</Text>
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

export default MedicalRecords;
