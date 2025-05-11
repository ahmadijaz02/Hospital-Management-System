import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  useToast,
  Text,
  HStack,
  Divider,
  SimpleGrid,
  Card,
  CardBody,
  Textarea,
  Select,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import Layout from '../shared/Layout';
import LocationPicker from '../shared/LocationPicker';
import axios from '../../utils/axios';
import { useNavigate } from 'react-router-dom';

const PatientProfile = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    height: '',
    weight: '',
    medicalHistory: '',
    allergies: '',
    location: null,
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    }
  });

  // Check user role and authentication
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!user || !token) {
      navigate('/login');
      return;
    }

    if (user.role.toLowerCase() !== 'patient') {
      navigate(`/${user.role.toLowerCase()}/dashboard`);
      return;
    }

    fetchProfile();
    
    // We'll let the LocationPicker handle getting the current location
  // as it now includes reverse geocoding to get the location name
  }, [navigate]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/users/profile');
      
      if (response.data.success) {
        const userData = response.data.data || {};
        setProfile({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          dateOfBirth: userData.dateOfBirth || '',
          gender: userData.gender || '',
          bloodGroup: userData.bloodGroup || '',
          height: userData.height || '',
          weight: userData.weight || '',
          medicalHistory: userData.medicalHistory || '',
          allergies: userData.allergies || '',
          location: userData.location || null,
          emergencyContact: userData.emergencyContact || {
            name: '',
            relationship: '',
            phone: ''
          }
        });
      } else {
        throw new Error(response.data.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch profile';
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
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
      setProfile(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setProfile(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      
      const response = await axios.put('/api/users/profile', profile);
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setIsEditing(false);
      } else {
        throw new Error(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile';
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location) => {
    setProfile(prev => ({
      ...prev,
      location: location
    }));
  };

  if (loading && !profile.name) {
    return (
      <Layout>
        <Box p={8} textAlign="center">
          <VStack spacing={4}>
            <Spinner size="xl" />
            <Text>Loading your profile...</Text>
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
            <Heading size="lg">Patient Profile</Heading>
            <Button
              colorScheme={isEditing ? "green" : "blue"}
              onClick={() => {
                if (isEditing) {
                  handleUpdateProfile();
                } else {
                  setIsEditing(true);
                }
              }}
              isLoading={loading}
            >
              {isEditing ? "Save Changes" : "Edit Profile"}
            </Button>
          </HStack>

          {error && (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <Card>
              <CardBody>
                <VStack spacing={6} align="stretch">
                  {/* Basic Information */}
                  <Box>
                    <Heading size="md" mb={4}>Basic Information</Heading>
                    <SimpleGrid columns={[1, 2]} spacing={4}>
                      <FormControl>
                        <FormLabel>Full Name</FormLabel>
                        <Input
                          name="name"
                          value={profile.name}
                          onChange={handleInputChange}
                          isReadOnly={!isEditing}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Email</FormLabel>
                        <Input
                          name="email"
                          value={profile.email}
                          onChange={handleInputChange}
                          isReadOnly={!isEditing}
                          type="email"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Phone</FormLabel>
                        <Input
                          name="phone"
                          value={profile.phone}
                          onChange={handleInputChange}
                          isReadOnly={!isEditing}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Address</FormLabel>
                        <Input
                          name="address"
                          value={profile.address}
                          onChange={handleInputChange}
                          isReadOnly={!isEditing}
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Box>

                  <Divider />

                  {/* Medical Information */}
                  <Box>
                    <Heading size="md" mb={4}>Medical Information</Heading>
                    <SimpleGrid columns={[1, 2]} spacing={4}>
                      <FormControl>
                        <FormLabel>Date of Birth</FormLabel>
                        <Input
                          name="dateOfBirth"
                          type="date"
                          value={profile.dateOfBirth}
                          onChange={handleInputChange}
                          isReadOnly={!isEditing}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Gender</FormLabel>
                        <Select
                          name="gender"
                          value={profile.gender}
                          onChange={handleInputChange}
                          isReadOnly={!isEditing}
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormLabel>Blood Group</FormLabel>
                        <Select
                          name="bloodGroup"
                          value={profile.bloodGroup}
                          onChange={handleInputChange}
                          isReadOnly={!isEditing}
                        >
                          <option value="">Select Blood Group</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormLabel>Height (cm)</FormLabel>
                        <Input
                          name="height"
                          type="number"
                          value={profile.height}
                          onChange={handleInputChange}
                          isReadOnly={!isEditing}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Weight (kg)</FormLabel>
                        <Input
                          name="weight"
                          type="number"
                          value={profile.weight}
                          onChange={handleInputChange}
                          isReadOnly={!isEditing}
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Box>

                  <Divider />

                  {/* Medical History */}
                  <Box>
                    <Heading size="md" mb={4}>Medical History</Heading>
                    <VStack spacing={4}>
                      <FormControl>
                        <FormLabel>Medical History</FormLabel>
                        <Textarea
                          name="medicalHistory"
                          value={profile.medicalHistory}
                          onChange={handleInputChange}
                          isReadOnly={!isEditing}
                          rows={4}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Allergies</FormLabel>
                        <Textarea
                          name="allergies"
                          value={profile.allergies}
                          onChange={handleInputChange}
                          isReadOnly={!isEditing}
                          rows={2}
                        />
                      </FormControl>
                    </VStack>
                  </Box>

                  <Divider />

                  {/* Emergency Contact */}
                  <Box>
                    <Heading size="md" mb={4}>Emergency Contact</Heading>
                    <SimpleGrid columns={[1, 2]} spacing={4}>
                      <FormControl>
                        <FormLabel>Name</FormLabel>
                        <Input
                          name="emergencyContact.name"
                          value={profile.emergencyContact.name}
                          onChange={handleInputChange}
                          isReadOnly={!isEditing}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Relationship</FormLabel>
                        <Input
                          name="emergencyContact.relationship"
                          value={profile.emergencyContact.relationship}
                          onChange={handleInputChange}
                          isReadOnly={!isEditing}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Phone</FormLabel>
                        <Input
                          name="emergencyContact.phone"
                          value={profile.emergencyContact.phone}
                          onChange={handleInputChange}
                          isReadOnly={!isEditing}
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Box>
                </VStack>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Location</Heading>
                  <LocationPicker
                    initialLocation={profile.location}
                    onLocationSelect={handleLocationSelect}
                  />
                  {profile.location && profile.location.name && (
                    <Text fontSize="sm" fontWeight="medium" color="blue.600">
                      Current Address: {profile.location.name}
                    </Text>
                  )}
                  <Text fontSize="sm" color="gray.500">
                    Click on the map to set your location or drag the marker to adjust
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </VStack>
      </Box>
    </Layout>
  );
};

export default PatientProfile; 