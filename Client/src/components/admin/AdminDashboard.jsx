import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Grid,
    Heading,
    Text,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    Card,
    CardBody,
    SimpleGrid,
    Progress,
    VStack,
    HStack,
    Badge,
    Spinner,
    Icon,
    Flex,
    Divider,
} from '@chakra-ui/react';
import { FiUsers, FiUserPlus, FiCalendar, FiClock, FiActivity } from 'react-icons/fi';
import axios from '../../utils/axios';
import { format } from 'date-fns';


const AdminDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        try {
            const response = await axios.get('/api/admin/stats');
            setDashboardData(response.data.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        // Auto refresh every 5 minutes
        const interval = setInterval(fetchDashboardData, 300000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
                <Spinner size="xl" />
            </Box>
        );
    }

    return (
        <Container maxW="container.xl" py={5}>
            <Flex justifyContent="space-between" alignItems="center" mb={6}>
                <Heading size="lg">Admin Dashboard</Heading>
            </Flex>

            <Grid templateColumns="repeat(4, 1fr)" gap={6} mb={8}>
                <Card>
                    <CardBody>
                        <Stat>
                            <StatLabel>Total Users</StatLabel>
                            <StatNumber>{dashboardData?.totalUsers || 0}</StatNumber>
                            <StatHelpText>All registered users</StatHelpText>
                        </Stat>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <Stat>
                            <StatLabel>Active Doctors</StatLabel>
                            <StatNumber>{dashboardData?.activeDoctors || 0}</StatNumber>
                            <StatHelpText>Verified doctors</StatHelpText>
                        </Stat>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <Stat>
                            <StatLabel>Active Patients</StatLabel>
                            <StatNumber>{dashboardData?.activePatients || 0}</StatNumber>
                            <StatHelpText>Verified patients</StatHelpText>
                        </Stat>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <Stat>
                            <StatLabel>Today's Appointments</StatLabel>
                            <StatNumber>{dashboardData?.todaysAppointments || 0}</StatNumber>
                            <StatHelpText>Scheduled for today</StatHelpText>
                        </Stat>
                    </CardBody>
                </Card>
            </Grid>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={8}>
                {/* Appointment Statistics */}
                <Card>
                    <CardBody>
                        <VStack align="stretch" spacing={4}>
                            <Heading size="md">Appointment Statistics</Heading>
                            <Box>
                                <Text mb={2}>Completed Appointments</Text>
                                <Progress value={dashboardData?.appointmentStats?.completedPercentage || 0} colorScheme="green" mb={4} />

                                <Text mb={2}>Cancelled Appointments</Text>
                                <Progress value={dashboardData?.appointmentStats?.cancelledPercentage || 0} colorScheme="red" mb={4} />

                                <Text mb={2}>Pending Appointments</Text>
                                <Progress value={dashboardData?.appointmentStats?.pendingPercentage || 0} colorScheme="yellow" />
                            </Box>
                            <Text fontSize="sm" color="gray.500">
                                Last 30 days statistics
                            </Text>
                        </VStack>
                    </CardBody>
                </Card>

                {/* Department Statistics */}
                <Card>
                    <CardBody>
                        <VStack align="stretch" spacing={4}>
                            <Heading size="md">Department Statistics</Heading>
                            {dashboardData?.departmentStats?.map((dept, index) => (
                                <Box key={index}>
                                    <HStack justify="space-between" mb={2}>
                                        <Text>{dept.name}</Text>
                                        <Badge colorScheme="blue">{dept.doctorCount} doctors</Badge>
                                    </HStack>
                                    <Progress value={dept.appointmentPercentage} colorScheme="blue" mb={2} />
                                </Box>
                            ))}
                            <Text fontSize="sm" color="gray.500">
                                Distribution of appointments by department
                            </Text>
                        </VStack>
                    </CardBody>
                </Card>
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                {/* Doctor Performance */}
                <Card>
                    <CardBody>
                        <VStack align="stretch" spacing={4}>
                            <Heading size="md">Top Performing Doctors</Heading>
                            {dashboardData?.topDoctors?.map((doctor, index) => (
                                <HStack key={index} justify="space-between">
                                    <Text>{doctor.name}</Text>
                                    <Badge colorScheme="green">{doctor.completionRate}% completion rate</Badge>
                                </HStack>
                            ))}
                            <Text fontSize="sm" color="gray.500">
                                Based on appointment completion rate
                            </Text>
                        </VStack>
                    </CardBody>
                </Card>

                {/* Patient Demographics */}
                <Card>
                    <CardBody>
                        <VStack align="stretch" spacing={4}>
                            <Heading size="md">Patient Demographics</Heading>
                            <SimpleGrid columns={2} spacing={4}>
                                <Box>
                                    <Stat>
                                        <StatLabel>New Patients</StatLabel>
                                        <StatNumber>{dashboardData?.patientStats?.newThisMonth || 0}</StatNumber>
                                        <StatHelpText>This month</StatHelpText>
                                    </Stat>
                                </Box>
                                <Box>
                                    <Stat>
                                        <StatLabel>Return Rate</StatLabel>
                                        <StatNumber>{dashboardData?.patientStats?.returnRate || 0}%</StatNumber>
                                        <StatHelpText>Last 30 days</StatHelpText>
                                    </Stat>
                                </Box>
                            </SimpleGrid>
                            <Divider />
                            <Text fontSize="sm" color="gray.500">
                                Patient engagement metrics
                            </Text>
                        </VStack>
                    </CardBody>
                </Card>
            </SimpleGrid>
        </Container>
    );
};

export default AdminDashboard;