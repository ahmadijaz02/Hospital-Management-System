import React, { useState } from 'react';
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
    useToast,
    InputGroup,
    InputRightElement,
    IconButton
} from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import axios from '../../utils/axios';

const ResetPassword = () => {
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const toast = useToast();
    const navigate = useNavigate();
    const { token } = useParams();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            toast({
                title: 'Error',
                description: 'Passwords do not match',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        setLoading(true);
        
        try {
            const response = await axios.post(`/api/auth/resetpassword/${token}`, {
                password: formData.password
            });
            
            if (response.data.success) {
                toast({
                    title: 'Success',
                    description: 'Password has been reset successfully',
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                });
                navigate('/login');
            }
        } catch (err) {
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'An error occurred',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxW="container.sm" py={8}>
            <VStack spacing={8}>
                <Heading>Reset Password</Heading>
                <Box w="100%" p={8} borderWidth={1} borderRadius={8} boxShadow="lg">
                    <VStack spacing={4} as="form" onSubmit={handleSubmit}>
                        <Text>
                            Please enter your new password below.
                        </Text>
                        
                        <FormControl isRequired>
                            <FormLabel>New Password</FormLabel>
                            <InputGroup>
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                                <InputRightElement>
                                    <IconButton
                                        icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                                        onClick={() => setShowPassword(!showPassword)}
                                        variant="ghost"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    />
                                </InputRightElement>
                            </InputGroup>
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel>Confirm New Password</FormLabel>
                            <InputGroup>
                                <Input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                                <InputRightElement>
                                    <IconButton
                                        icon={showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        variant="ghost"
                                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                    />
                                </InputRightElement>
                            </InputGroup>
                        </FormControl>

                        <Button
                            type="submit"
                            colorScheme="blue"
                            width="100%"
                            isLoading={loading}
                        >
                            Reset Password
                        </Button>
                    </VStack>
                </Box>
            </VStack>
        </Container>
    );
};

export default ResetPassword;
