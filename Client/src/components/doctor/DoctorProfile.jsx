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
  Avatar,
  HStack,
  Divider,
  SimpleGrid,
  Card,
  CardBody,
  Badge,
  Textarea,
  Switch,
  Select,
  Alert,
  AlertIcon,
  Spinner,
} from '@chakra-ui/react';
import Layout from '../shared/Layout';
import axios from '../../utils/axios';
import { useNavigate } from 'react-router-dom';

const DoctorProfile = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    experience: '',
    qualifications: '',
    bio: '',
    consultationFee: '',
    availableForConsultation: true,
    workingHours: {
      start: '09:00',
      end: '17:00'
    },
    address: '',
    languages: []
  });

  // Check user role and authentication
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    console.log('DoctorProfile Init:', {
      user,
      token: token ? 'exists' : 'missing',
      currentPath: window.location.pathname
    });

    if (!user || !token) {
      navigate('/login');
      return;
    }

    if (user.role.toLowerCase() !== 'doctor') {
      navigate(`/${user.role.toLowerCase()}/dashboard`);
      return;
    }

    fetchProfile();
  }, [navigate]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user ID from localStorage
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!user?.id) {
        throw new Error('User ID not found');
      }

      console.log('Fetching profile for user:', user);
      
      // Get basic user profile data
      const profileResponse = await axios.get('/api/users/profile');
      
      console.log('User Profile API Response:', {
        success: profileResponse.data.success,
        status: profileResponse.status,
        data: profileResponse.data
      });

      // Get doctor-specific data
      const doctorResponse = await axios.get(`/api/doctors/${user.id}`);
      
      console.log('Doctor Profile API Response:', {
        success: doctorResponse.data.success,
        status: doctorResponse.status,
        data: doctorResponse.data
      });

      if (profileResponse.data.success && doctorResponse.data.success) {
        const userData = profileResponse.data.data || {};
        const doctorData = doctorResponse.data.data || {};
        
        // Get schedule data
        try {
          const scheduleResponse = await axios.get(`/api/schedules/schedule/${user.id}`);
          const scheduleData = scheduleResponse.data.success ? scheduleResponse.data.data : null;
          
          console.log('Schedule API Response:', {
            success: scheduleResponse.data.success,
            data: scheduleResponse.data
          });

          setProfile({
            name: userData.name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            address: userData.address || '',
            specialization: doctorData.specialization || '',
            experience: doctorData.experience || '',
            qualifications: doctorData.qualification || '',
            bio: doctorData.bio || '',
            consultationFee: doctorData.consultationFee || '',
            availableForConsultation: doctorData.isAvailable ?? true,
            workingHours: scheduleData?.workingHours || {
              start: '09:00',
              end: '17:00'
            },
            languages: doctorData.languages || []
          });
        } catch (scheduleError) {
          console.warn('Failed to fetch schedule, using defaults:', scheduleError);
          setProfile({
            name: userData.name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            address: userData.address || '',
            specialization: doctorData.specialization || '',
            experience: doctorData.experience || '',
            qualifications: doctorData.qualification || '',
            bio: doctorData.bio || '',
            consultationFee: doctorData.consultationFee || '',
            availableForConsultation: doctorData.isAvailable ?? true,
            workingHours: {
              start: '09:00',
              end: '17:00'
            },
            languages: doctorData.languages || []
          });
        }
      } else {
        throw new Error(profileResponse.data.message || doctorResponse.data.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Profile fetch error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

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

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      
      // Get user ID from localStorage
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!user?.id) {
        throw new Error('User ID not found');
      }

      console.log('Updating profile:', {
        userId: user.id,
        data: profile
      });

      // First update basic user profile
      const userProfileResponse = await axios.put('/api/users/profile', {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        address: profile.address
      });

      console.log('User Profile Update Response:', userProfileResponse.data);

      if (!userProfileResponse.data.success) {
        throw new Error(userProfileResponse.data.message || 'Failed to update user profile');
      }

      // Then update doctor-specific information
      const doctorProfileResponse = await axios.put(`/api/doctors/${user.id}`, {
        specialization: profile.specialization,
        qualification: profile.qualifications,
        experience: parseInt(profile.experience) || 0,
        consultationFee: parseInt(profile.consultationFee) || 0,
        isAvailable: profile.availableForConsultation,
        bio: profile.bio,
        languages: profile.languages,
        schedule: [
          {
            day: 'Monday',
            startTime: profile.workingHours.start,
            endTime: profile.workingHours.end
          },
          {
            day: 'Tuesday',
            startTime: profile.workingHours.start,
            endTime: profile.workingHours.end
          },
          {
            day: 'Wednesday',
            startTime: profile.workingHours.start,
            endTime: profile.workingHours.end
          },
          {
            day: 'Thursday',
            startTime: profile.workingHours.start,
            endTime: profile.workingHours.end
          },
          {
            day: 'Friday',
            startTime: profile.workingHours.start,
            endTime: profile.workingHours.end
          }
        ]
      });

      console.log('Doctor Profile Update Response:', doctorProfileResponse.data);

      if (!doctorProfileResponse.data.success) {
        throw new Error(doctorProfileResponse.data.message || 'Failed to update doctor profile');
      }

      // Show success message
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Refresh the profile data
      await fetchProfile();
      
      setIsEditing(false);
    } catch (error) {
      console.error('Profile update error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.errors?.[0]?.msg || 
                         error.message || 
                         'Failed to update profile';

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

  if (loading) {
    return (
      <Layout>
        <Box p={4}>
          <VStack spacing={4}>
            <Spinner size="xl" />
            <Text>Loading profile...</Text>
          </VStack>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box p={4}>
        <VStack spacing={6} align="stretch">
          {error && (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <HStack justify="space-between">
            <Heading size="lg">Doctor Profile</Heading>
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
              {isEditing ? 'Save Changes' : 'Edit Profile'}
            </Button>
          </HStack>

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
                      <FormLabel>Specialization</FormLabel>
                      <Input
                        name="specialization"
                        value={profile.specialization}
                        onChange={handleInputChange}
                        isReadOnly={!isEditing}
                      />
                    </FormControl>
                  </SimpleGrid>
                </Box>

                <Divider />

                {/* Professional Information */}
                <Box>
                  <Heading size="md" mb={4}>Professional Information</Heading>
                  <SimpleGrid columns={[1, 2]} spacing={4}>
                    <FormControl>
                      <FormLabel>Experience (years)</FormLabel>
                      <Input
                        name="experience"
                        type="number"
                        value={profile.experience}
                        onChange={handleInputChange}
                        isReadOnly={!isEditing}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Consultation Fee</FormLabel>
                      <Input
                        name="consultationFee"
                        type="number"
                        value={profile.consultationFee}
                        onChange={handleInputChange}
                        isReadOnly={!isEditing}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Qualifications</FormLabel>
                      <Input
                        name="qualifications"
                        value={profile.qualifications}
                        onChange={handleInputChange}
                        isReadOnly={!isEditing}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Languages</FormLabel>
                      <Input
                        name="languages"
                        value={profile.languages.join(', ')}
                        onChange={(e) => handleInputChange({
                          target: {
                            name: 'languages',
                            value: e.target.value.split(',').map(lang => lang.trim())
                          }
                        })}
                        isReadOnly={!isEditing}
                        placeholder="Enter languages separated by commas"
                      />
                    </FormControl>
                  </SimpleGrid>
                </Box>

                <Divider />

                {/* Working Hours */}
                <Box>
                  <Heading size="md" mb={4}>Working Hours</Heading>
                  <SimpleGrid columns={[1, 2]} spacing={4}>
                    <FormControl>
                      <FormLabel>Start Time</FormLabel>
                      <Input
                        name="workingHours.start"
                        type="time"
                        value={profile.workingHours.start}
                        onChange={handleInputChange}
                        isReadOnly={!isEditing}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>End Time</FormLabel>
                      <Input
                        name="workingHours.end"
                        type="time"
                        value={profile.workingHours.end}
                        onChange={handleInputChange}
                        isReadOnly={!isEditing}
                      />
                    </FormControl>
                  </SimpleGrid>
                </Box>

                <Divider />

                {/* Additional Information */}
                <Box>
                  <Heading size="md" mb={4}>Additional Information</Heading>
                  <VStack spacing={4}>
                    <FormControl>
                      <FormLabel>Bio</FormLabel>
                      <Textarea
                        name="bio"
                        value={profile.bio}
                        onChange={handleInputChange}
                        isReadOnly={!isEditing}
                        rows={4}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Address</FormLabel>
                      <Textarea
                        name="address"
                        value={profile.address}
                        onChange={handleInputChange}
                        isReadOnly={!isEditing}
                        rows={2}
                      />
                    </FormControl>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Available for Consultation</FormLabel>
                      <Switch
                        name="availableForConsultation"
                        isChecked={profile.availableForConsultation}
                        onChange={(e) => handleInputChange({
                          target: {
                            name: 'availableForConsultation',
                            value: e.target.checked
                          }
                        })}
                        isDisabled={!isEditing}
                      />
                    </FormControl>
                  </VStack>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Box>
    </Layout>
  );
};

export default DoctorProfile; 