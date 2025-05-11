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
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Text,
    Badge,
} from '@chakra-ui/react';
import { FiEdit2, FiEye, FiFileText } from 'react-icons/fi';
import axios from '../../utils/axios';
import { format } from 'date-fns';

const PatientRecordManagement = () => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        bloodGroup: '',
        allergies: '',
        emergencyContact: {
            name: '',
            phone: '',
            relationship: '',
        },
    });

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/patients');
            setPatients(response.data.data);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to fetch patients');
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to fetch patients',
                status: 'error',
                duration: 5000,
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
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleUpdatePatient = async () => {
        try {
            const response = await axios.put(
                `/api/admin/patients/${selectedPatient._id}`,
                {
                    ...formData,
                    dateOfBirth: formData.dateOfBirth || null,
                    emergencyContact: {
                        name: formData.emergencyContact.name || '',
                        phone: formData.emergencyContact.phone || '',
                        relationship: formData.emergencyContact.relationship || ''
                    }
                }
            );
            toast({
                title: 'Success',
                description: 'Patient record updated successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            fetchPatients();
            onClose();
        } catch (error) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update patient record',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleViewPatient = async (patientId) => {
        try {
            const response = await axios.get(`/api/admin/patients/${patientId}`);
            const patientData = response.data.data;
            setSelectedPatient(patientData);
            setFormData({
                name: patientData.name || '',
                email: patientData.email || '',
                phone: patientData.phone || '',
                dateOfBirth: patientData.dateOfBirth ? format(new Date(patientData.dateOfBirth), 'yyyy-MM-dd') : '',
                gender: patientData.gender || '',
                bloodGroup: patientData.bloodGroup || '',
                allergies: patientData.allergies || '',
                emergencyContact: patientData.emergencyContact || {
                    name: '',
                    phone: '',
                    relationship: ''
                }
            });
            onOpen();
        } catch (error) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to fetch patient details',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const filteredPatients = patients.filter(patient =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    <Heading size="lg">Patient Record Management</Heading>
                </HStack>

                <Input
                    placeholder="Search patients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    mb={5}
                />
            </Box>

            <Table variant="simple">
                <Thead>
                    <Tr>
                        <Th>Name</Th>
                        <Th>Email</Th>
                        <Th>Phone</Th>
                        <Th>Date of Birth</Th>
                        <Th>Actions</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {filteredPatients.map((patient) => (
                        <Tr key={patient._id}>
                            <Td>{patient.name}</Td>
                            <Td>{patient.email}</Td>
                            <Td>{patient.phone || 'Not provided'}</Td>
                            <Td>{patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'MMM dd, yyyy') : 'Not provided'}</Td>
                            <Td>
                                <HStack spacing={2}>
                                    <IconButton
                                        icon={<FiEye />}
                                        aria-label="View patient record"
                                        size="sm"
                                        colorScheme="blue"
                                        onClick={() => handleViewPatient(patient._id)}
                                    />
                                    <IconButton
                                        icon={<FiEdit2 />}
                                        aria-label="Edit patient record"
                                        size="sm"
                                        colorScheme="green"
                                        onClick={() => handleViewPatient(patient._id)}
                                    />
                                </HStack>
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>

            <Modal isOpen={isOpen} onClose={onClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Patient Record</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Tabs>
                            <TabList>
                                <Tab>Personal Info</Tab>
                                <Tab>Medical Info</Tab>
                                <Tab>Emergency Contact</Tab>
                            </TabList>

                            <TabPanels>
                                <TabPanel>
                                    <VStack spacing={4}>
                                        <FormControl>
                                            <FormLabel>Name</FormLabel>
                                            <Input
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                            />
                                        </FormControl>
                                        <FormControl>
                                            <FormLabel>Email</FormLabel>
                                            <Input
                                                name="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                            />
                                        </FormControl>
                                        <FormControl>
                                            <FormLabel>Phone</FormLabel>
                                            <Input
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                            />
                                        </FormControl>
                                        <FormControl>
                                            <FormLabel>Date of Birth</FormLabel>
                                            <Input
                                                name="dateOfBirth"
                                                type="date"
                                                value={formData.dateOfBirth}
                                                onChange={handleInputChange}
                                            />
                                        </FormControl>
                                        <FormControl>
                                            <FormLabel>Gender</FormLabel>
                                            <Input
                                                name="gender"
                                                value={formData.gender}
                                                onChange={handleInputChange}
                                            />
                                        </FormControl>
                                    </VStack>
                                </TabPanel>
                                <TabPanel>
                                    <VStack spacing={4}>
                                        <FormControl>
                                            <FormLabel>Blood Group</FormLabel>
                                            <Input
                                                name="bloodGroup"
                                                value={formData.bloodGroup}
                                                onChange={handleInputChange}
                                            />
                                        </FormControl>
                                        <FormControl>
                                            <FormLabel>Allergies</FormLabel>
                                            <Input
                                                name="allergies"
                                                value={formData.allergies}
                                                onChange={handleInputChange}
                                            />
                                        </FormControl>
                                    </VStack>
                                </TabPanel>
                                <TabPanel>
                                    <VStack spacing={4}>
                                        <FormControl>
                                            <FormLabel>Emergency Contact Name</FormLabel>
                                            <Input
                                                name="emergencyContact.name"
                                                value={formData.emergencyContact.name}
                                                onChange={handleInputChange}
                                            />
                                        </FormControl>
                                        <FormControl>
                                            <FormLabel>Emergency Contact Phone</FormLabel>
                                            <Input
                                                name="emergencyContact.phone"
                                                value={formData.emergencyContact.phone}
                                                onChange={handleInputChange}
                                            />
                                        </FormControl>
                                        <FormControl>
                                            <FormLabel>Relationship</FormLabel>
                                            <Input
                                                name="emergencyContact.relationship"
                                                value={formData.emergencyContact.relationship}
                                                onChange={handleInputChange}
                                            />
                                        </FormControl>
                                    </VStack>
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button colorScheme="blue" onClick={handleUpdatePatient}>
                            Update Record
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Container>
    );
};

export default PatientRecordManagement; 