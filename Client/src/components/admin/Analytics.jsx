import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Heading,
    SimpleGrid,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    StatArrow,
    Select,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    useToast,
    Spinner,
    Alert,
    AlertIcon,
    Card,
    CardHeader,
    CardBody,
    Text,
} from '@chakra-ui/react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import axios from '../../utils/axios';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const Analytics = () => {
    const [timeRange, setTimeRange] = useState('week');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [analyticsData, setAnalyticsData] = useState({
        appointments: {
            total: 0,
            completed: 0,
            cancelled: 0,
            history: []
        },
        patients: {
            total: 0,
            new: 0,
            active: 0
        },
        doctors: {
            performance: [],
            specialtyDistribution: []
        }
    });

    const toast = useToast();

    useEffect(() => {
        fetchAnalyticsData();
    }, [timeRange]);

    const fetchAnalyticsData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/admin/analytics?timeRange=${timeRange}`);
            setAnalyticsData(response.data.data);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to fetch analytics data');
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to fetch analytics data',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const appointmentChartData = {
        labels: analyticsData.appointments.history.map(item => format(new Date(item.date), 'MMM dd')),
        datasets: [
            {
                label: 'Appointments',
                data: analyticsData.appointments.history.map(item => item.total),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
            },
        ],
    };

    const specialtyDistributionData = {
        labels: analyticsData.doctors.specialtyDistribution.map(item => item.specialty),
        datasets: [
            {
                data: analyticsData.doctors.specialtyDistribution.map(item => item.count),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)',
                ],
            },
        ],
    };

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
                <Heading size="lg" mb={5}>Analytics & Reports</Heading>
                <Select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    w="200px"
                    mb={5}
                >
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="year">Last Year</option>
                </Select>
            </Box>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5} mb={10}>
                <Card>
                    <CardBody>
                        <Stat>
                            <StatLabel>Total Appointments</StatLabel>
                            <StatNumber>{analyticsData.appointments.total}</StatNumber>
                            <StatHelpText>
                                Completed: {analyticsData.appointments.completed}
                            </StatHelpText>
                        </Stat>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <Stat>
                            <StatLabel>Total Patients</StatLabel>
                            <StatNumber>{analyticsData.patients.total}</StatNumber>
                            <StatHelpText>
                                New: {analyticsData.patients.new}
                            </StatHelpText>
                        </Stat>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <Stat>
                            <StatLabel>Active Patients</StatLabel>
                            <StatNumber>{analyticsData.patients.active}</StatNumber>
                            <StatHelpText>
                                Of total patients
                            </StatHelpText>
                        </Stat>
                    </CardBody>
                </Card>
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={10} mb={10}>
                <Card>
                    <CardHeader>
                        <Heading size="md">Appointment Statistics</Heading>
                    </CardHeader>
                    <CardBody>
                        <Box h="300px">
                            <Bar
                                data={appointmentChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            position: 'top',
                                        },
                                    },
                                }}
                            />
                        </Box>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <Heading size="md">Specialty Distribution</Heading>
                    </CardHeader>
                    <CardBody>
                        <Box h="300px">
                            <Pie
                                data={specialtyDistributionData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            position: 'right',
                                        },
                                    },
                                }}
                            />
                        </Box>
                    </CardBody>
                </Card>
            </SimpleGrid>

            <Card>
                <CardHeader>
                    <Heading size="md">Doctor Performance</Heading>
                </CardHeader>
                <CardBody>
                    <Table variant="simple">
                        <Thead>
                            <Tr>
                                <Th>Doctor</Th>
                                <Th>Appointments</Th>
                                <Th>Success Rate</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {analyticsData.doctors.performance.map((doctor, index) => (
                                <Tr key={index}>
                                    <Td>{doctor.name}</Td>
                                    <Td>{doctor.appointments}</Td>
                                    <Td>{doctor.successRate}%</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </CardBody>
            </Card>
        </Container>
    );
};

export default Analytics; 