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
    Badge,
    HStack,
    Select,
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
} from '@chakra-ui/react';
import { FiEdit2, FiTrash2, FiUserPlus } from 'react-icons/fi';
import axios from '../../utils/axios';
import { format } from 'date-fns';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [filterRole, setFilterRole] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'patient',
        password: '',
        phone: '',
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/users');
            setUsers(response.data.data);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to fetch users');
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to fetch users',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    // Add User functionality removed

    const handleUpdateUser = async () => {
        try {
            const response = await axios.put(`/api/admin/users/${selectedUser._id}`, formData);
            toast({
                title: 'Success',
                description: 'User updated successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            fetchUsers();
            onClose();
            setSelectedUser(null);
            setFormData({
                name: '',
                email: '',
                role: 'patient',
                password: '',
                phone: '',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update user',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                const response = await axios.delete(`/api/admin/users/${userId}`);
                
                if (response.data.success) {
                    toast({
                        title: 'Success',
                        description: 'User deleted successfully',
                        status: 'success',
                        duration: 3000,
                        isClosable: true,
                    });
                    // Refresh the users list
                    fetchUsers();
                } else {
                    throw new Error(response.data.message || 'Failed to delete user');
                }
            } catch (error) {
                console.error('Delete user error:', error);
                toast({
                    title: 'Error',
                    description: error.response?.data?.message || error.message || 'Failed to delete user',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    };

    const handleModalClose = () => {
        setSelectedUser(null);
        setFormData({
            name: '',
            email: '',
            role: 'patient',
            password: '',
            phone: '',
        });
        onClose();
    };

    const filteredUsers = users.filter(user => {
        const roleMatch = filterRole === 'all' || user.role === filterRole;
        const searchMatch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        return roleMatch && searchMatch;
    });

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
                    <Heading size="lg">User Management</Heading>
                </HStack>

                <HStack mb={5} spacing={4}>
                    <Select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        w="200px"
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="doctor">Doctor</option>
                        <option value="patient">Patient</option>
                    </Select>
                    <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </HStack>
            </Box>

            <Table variant="simple">
                <Thead>
                    <Tr>
                        <Th>Name</Th>
                        <Th>Email</Th>
                        <Th>Role</Th>
                        <Th>Joined Date</Th>
                        <Th>Actions</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {filteredUsers.map((user) => (
                        <Tr key={user._id}>
                            <Td>{user.name}</Td>
                            <Td>{user.email}</Td>
                            <Td>
                                <Badge
                                    colorScheme={
                                        user.role === 'admin' ? 'red' :
                                        user.role === 'doctor' ? 'green' : 'blue'
                                    }
                                >
                                    {user.role}
                                </Badge>
                            </Td>
                            <Td>{format(new Date(user.createdAt), 'MMM dd, yyyy')}</Td>
                            <Td>
                                <HStack spacing={2}>
                                    <IconButton
                                        icon={<FiEdit2 />}
                                        aria-label="Edit user"
                                        size="sm"
                                        colorScheme="blue"
                                        onClick={() => {
                                            // Only allow editing existing users
                                            if (user) {
                                                setSelectedUser(user);
                                                setFormData({
                                                    name: user.name,
                                                    email: user.email,
                                                    role: user.role,
                                                    phone: user.phone || '',
                                                });
                                                onOpen();
                                            }
                                        }}
                                    />
                                    <IconButton
                                        icon={<FiTrash2 />}
                                        aria-label="Delete user"
                                        size="sm"
                                        colorScheme="red"
                                        onClick={() => handleDeleteUser(user._id)}
                                        isDisabled={user.role === 'admin'}
                                    />
                                </HStack>
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>

            <Modal isOpen={isOpen} onClose={handleModalClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        Edit User
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <FormControl mb={4}>
                            <FormLabel>Name</FormLabel>
                            <Input
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                            />
                        </FormControl>
                        <FormControl mb={4}>
                            <FormLabel>Email</FormLabel>
                            <Input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                            />
                        </FormControl>
                        <FormControl mb={4}>
                            <FormLabel>Role</FormLabel>
                            <Select
                                name="role"
                                value={formData.role}
                                onChange={handleInputChange}
                            >
                                <option value="patient">Patient</option>
                                <option value="doctor">Doctor</option>
                                <option value="admin">Admin</option>
                            </Select>
                        </FormControl>
                        {/* Password field removed */}
                        <FormControl mb={4}>
                            <FormLabel>Phone</FormLabel>
                            <Input
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                            />
                        </FormControl>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={handleModalClose}>
                            Cancel
                        </Button>
                        <Button 
                            colorScheme="blue" 
                            onClick={handleUpdateUser}
                        >
                            Update
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Container>
    );
};

export default UserManagement; 