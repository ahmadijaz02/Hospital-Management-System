import React from 'react';
import {
    Box,
    Flex,
    VStack,
    Icon,
    Text,
    Link,
    useColorModeValue,
    Container,
    IconButton,
    useDisclosure,
    Drawer,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    DrawerHeader,
    DrawerBody,
    Button,
    useToast,
} from '@chakra-ui/react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
    FiHome,
    FiUsers,
    FiCalendar,
    FiClock,
    FiFileText,
    FiBarChart2,
    FiMenu,
    FiLogOut,
} from 'react-icons/fi';
import axios from '../../utils/axios';

const NavItem = ({ icon, children, to }) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    const activeBg = useColorModeValue('blue.50', 'blue.900');
    const activeColor = useColorModeValue('blue.600', 'blue.200');
    const hoverBg = useColorModeValue('gray.100', 'gray.700');

    return (
        <Link
            as={RouterLink}
            to={to}
            style={{ textDecoration: 'none' }}
            _focus={{ boxShadow: 'none' }}
        >
            <Flex
                align="center"
                p="4"
                mx="4"
                borderRadius="lg"
                role="group"
                cursor="pointer"
                bg={isActive ? activeBg : 'transparent'}
                color={isActive ? activeColor : 'inherit'}
                _hover={{
                    bg: hoverBg,
                }}
            >
                {icon && (
                    <Icon
                        mr="4"
                        fontSize="16"
                        as={icon}
                    />
                )}
                {children}
            </Flex>
        </Link>
    );
};

const Sidebar = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const menuItems = [
        { name: 'Dashboard', icon: FiHome, path: '/admin/dashboard' },
        { name: 'User Management', icon: FiUsers, path: '/admin/users' },
        { name: 'Appointments', icon: FiCalendar, path: '/admin/appointments' },
        { name: 'Doctor Schedules', icon: FiClock, path: '/admin/doctor-schedules' },
        { name: 'Patient Records', icon: FiFileText, path: '/admin/patient-records' },
        { name: 'Analytics', icon: FiBarChart2, path: '/admin/analytics' },
    ];

    const handleLogout = async () => {
        try {
            await axios.post('/api/auth/logout');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            toast({
                title: 'Logged out successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            toast({
                title: 'Error logging out',
                description: 'Please try again',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        }
    };

    return (
        <Box
            bg={useColorModeValue('white', 'gray.900')}
            borderRight="1px"
            borderRightColor={useColorModeValue('gray.200', 'gray.700')}
            w={{ base: 'full', md: 60 }}
            pos="fixed"
            h="full"
        >
            <VStack h="full" spacing={0} align="stretch">
                <Box p={5} borderBottom="1px" borderColor={useColorModeValue('gray.200', 'gray.700')}>
                    <Text fontSize="2xl" fontWeight="bold" color={useColorModeValue('blue.600', 'blue.200')}>
                        Admin Panel
                    </Text>
                </Box>
                <VStack spacing={0} align="stretch" flex={1}>
                    {menuItems.map((item) => (
                        <NavItem key={item.path} icon={item.icon} to={item.path}>
                            {item.name}
                        </NavItem>
                    ))}
                </VStack>
                {/* Logout button at the bottom of sidebar */}
                <Box p={4} borderTop="1px" borderColor={useColorModeValue('gray.200', 'gray.700')}>
                    <Button
                        leftIcon={<Icon as={FiLogOut} />}
                        colorScheme="red"
                        variant="outline"
                        width="100%"
                        onClick={handleLogout}
                    >
                        Logout
                    </Button>
                </Box>
            </VStack>
        </Box>
    );
};

const AdminLayout = ({ children }) => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const bgColor = useColorModeValue('gray.50', 'gray.800');

    return (
        <Box minH="100vh" bg={bgColor}>
            {/* Mobile nav */}
            <Box display={{ base: 'flex', md: 'none' }} alignItems="center" p={4}>
                <IconButton
                    onClick={onOpen}
                    icon={<FiMenu />}
                    variant="outline"
                    aria-label="open menu"
                />
            </Box>

            {/* Sidebar for mobile */}
            <Drawer
                isOpen={isOpen}
                placement="left"
                onClose={onClose}
            >
                <DrawerOverlay />
                <DrawerContent>
                    <DrawerCloseButton />
                    <DrawerHeader>Admin Panel</DrawerHeader>
                    <DrawerBody p={0}>
                        <Sidebar />
                    </DrawerBody>
                </DrawerContent>
            </Drawer>

            {/* Sidebar for desktop */}
            <Box display={{ base: 'none', md: 'block' }}>
                <Sidebar />
            </Box>

            {/* Main content */}
            <Box ml={{ base: 0, md: 60 }} p={4}>
                <Container maxW="container.xl">
                    {children}
                </Container>
            </Box>
        </Box>
    );
};

export default AdminLayout;