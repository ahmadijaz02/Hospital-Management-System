import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import {
    Box,
    Button,
    Container,
    FormControl,
    FormLabel,
    Input,
    VStack,
    Heading,
    Text,
    Divider,
    useToast,
    Center,
    Link
} from '@chakra-ui/react';
import axios from '../../utils/axios';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const toast = useToast();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleLoginSuccess = (data) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect based on user role
        switch (data.user.role.toLowerCase()) {
            case 'admin':
                navigate('/admin/dashboard');
                break;
            case 'doctor':
                navigate('/doctor/dashboard');
                break;
            case 'patient':
                navigate('/patient/dashboard');
                break;
            default:
                navigate('/login');
                toast({
                    title: 'Error',
                    description: 'Invalid user role',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            console.log('Sending login request:', formData);
            const response = await axios.post('/api/auth/login', formData);
            console.log('Login response:', response.data);

            if (response.data.success) {
                handleLoginSuccess(response.data);
            } else {
                throw new Error(response.data.message || 'Login failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
            console.error('Error details:', {
                status: err.response?.status,
                data: err.response?.data,
                message: errorMessage
            });
            toast({
                title: 'Error',
                description: errorMessage,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            setLoading(true);
            
            if (!credentialResponse?.credential) {
                throw new Error('No credential received from Google');
            }

            const response = await axios.post('/api/auth/google', {
                credential: credentialResponse.credential
            });

            if (response.data.success) {
                handleLoginSuccess(response.data);
            } else {
                throw new Error('Login failed');
            }
        } catch (err) {
            toast({
                title: 'Error',
                description: err.message || 'Failed to authenticate with Google',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = () => {
        toast({
            title: 'Error',
            description: 'Google Sign-In was unsuccessful',
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
    };

    return (
        <Container maxW="container.sm" py={8}>
            <VStack spacing={8}>
                <Heading>Hospital Management System</Heading>
                <Box w="100%" p={8} borderWidth={1} borderRadius={8} boxShadow="lg">
                    <VStack spacing={4} as="form" onSubmit={handleSubmit}>
                        <FormControl isRequired>
                            <FormLabel>Email Address</FormLabel>
                            <Input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel>Password</FormLabel>
                            <Input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </FormControl>

                        <Text align="right" w="100%">
                            <Link 
                                as={RouterLink} 
                                to="/forgot-password" 
                                color="blue.500"
                                onClick={() => {
                                    if (formData.email) {
                                        localStorage.setItem('loginEmail', formData.email);
                                    }
                                }}
                            >
                                Forgot Password?
                            </Link>
                        </Text>

                        <Button
                            type="submit"
                            colorScheme="blue"
                            width="100%"
                            isLoading={loading}
                        >
                            Sign In
                        </Button>

                        <Text>
                            Don't have an account?{' '}
                            <Link as={RouterLink} to="/signup" color="blue.500">
                                Sign Up
                            </Link>
                        </Text>
                    </VStack>

                    <Divider my={6} />

                    <Center>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            useOneTap
                            disabled={loading}
                        />
                    </Center>
                </Box>
            </VStack>
        </Container>
    );
};

export default Login; 