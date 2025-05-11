import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    VStack,
    HStack,
    Input,
    Button,
    Text,
    Avatar,
    Flex,
    Divider,
    useToast,
    Badge,
    IconButton,
    Tooltip,
    Heading,
    Spinner,
} from '@chakra-ui/react';
import { FiSend, FiRefreshCw } from 'react-icons/fi';
import io from 'socket.io-client';
import axios from '../../utils/axios';

const SOCKET_URL = process.env.REACT_APP_CHAT_SERVICE_URL || 'http://localhost:5001';

const Chat = ({ userType }) => {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [socket, setSocket] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(true);
    const messagesEndRef = useRef(null);
    const processedMessages = useRef(new Set());
    const toast = useToast();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const initializeChat = async () => {
            try {
                setConnecting(true);
                const currentUser = JSON.parse(localStorage.getItem('user'));
                const token = localStorage.getItem('token');

                if (!currentUser || !token) {
                    console.error('Missing user data or token:', { currentUser, hasToken: !!token });
                    toast({
                        title: 'Authentication Error',
                        description: 'Please login again to continue.',
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                    return;
                }

                setUser(currentUser);

                const newSocket = io(SOCKET_URL, {
                    auth: { token },
                    transports: ['websocket'],
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000
                });

                newSocket.on('connect', () => {
                    console.log('Socket connected, sending join event');
                    const userData = {
                        id: currentUser.id,
                        name: currentUser.username,
                        type: currentUser.role
                    };
                    newSocket.emit('join', userData);
                    setConnecting(false);
                });

                newSocket.on('message', (newMessage) => {
                    console.log('Received new message:', newMessage);
                    setMessages(prev => [...prev, newMessage]);
                    scrollToBottom();
                });

                newSocket.on('onlineUsers', (users) => {
                    console.log('Received online users:', users);
                    setOnlineUsers(users);
                });

                newSocket.on('connect_error', (error) => {
                    console.error('Socket connection error:', error);
                    toast({
                        title: 'Connection Error',
                        description: 'Failed to connect to chat server. Please try again.',
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                    setConnecting(false);
                });

                setSocket(newSocket);
                await loadMessages();

                return () => {
                    newSocket.close();
                };
            } catch (error) {
                console.error('Error initializing chat:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to initialize chat. Please refresh the page.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                setConnecting(false);
            }
        };

        initializeChat();
    }, [userType, toast]);

    const loadMessages = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/chat/messages');
            console.log('Loaded messages:', response.data);
            
            if (response.data.success) {
                setMessages(response.data.data);
                scrollToBottom();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            toast({
                title: 'Error',
                description: 'Failed to load messages',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = () => {
        if (!message.trim() || !user || !socket) return;

        try {
            const messageData = {
                content: message.trim()
            };

            socket.emit('sendMessage', messageData, (error) => {
                if (error) {
                    console.error('Error sending message:', error);
                    toast({
                        title: 'Error',
                        description: 'Failed to send message. Please try again.',
                        status: 'error',
                        duration: 3000,
                        isClosable: true,
                    });
                }
            });

            setMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            toast({
                title: 'Error',
                description: 'Failed to send message. Please try again.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (connecting) {
        return (
            <Box height="100%" display="flex" alignItems="center" justifyContent="center">
                <VStack spacing={4}>
                    <Spinner size="xl" />
                    <Text>Connecting to chat...</Text>
                </VStack>
            </Box>
        );
    }

    return (
        <Box p={4} height="100%">
            <Flex height="100%">
                {/* Online Users Sidebar */}
                <Box
                    width="250px"
                    borderRight="1px"
                    borderColor="gray.200"
                    pr={4}
                    overflowY="auto"
                >
                    <VStack align="stretch" spacing={4}>
                        <Heading size="md">
                            {userType === 'doctor' ? 'Online Patients' : 'Online Doctors'}
                        </Heading>
                        <Divider />
                        {onlineUsers.map((user) => (
                            <HStack key={user.id} spacing={3}>
                                <Avatar size="sm" name={user.name} />
                                <Box flex="1">
                                    <Text fontSize="sm" fontWeight="medium">
                                        {user.name}
                                    </Text>
                                    <Badge colorScheme={user.type === 'doctor' ? 'green' : 'blue'}>
                                        {user.type}
                                    </Badge>
                                </Box>
                            </HStack>
                        ))}
                        {onlineUsers.length === 0 && (
                            <Text color="gray.500" fontSize="sm">
                                No {userType === 'doctor' ? 'patients' : 'doctors'} online
                            </Text>
                        )}
                    </VStack>
                </Box>

                {/* Chat Area */}
                <Box flex="1" pl={4}>
                    <VStack height="100%" spacing={4}>
                        {/* Messages Container */}
                        <Box
                            flex="1"
                            width="100%"
                            overflowY="auto"
                            borderRadius="md"
                            bg="gray.50"
                            p={4}
                        >
                            <VStack align="stretch" spacing={4}>
                                {messages.map((msg, index) => (
                                    <Box
                                        key={index}
                                        alignSelf={msg.sender === user?.id ? "flex-end" : "flex-start"}
                                        maxW="70%"
                                    >
                                        <HStack spacing={2} mb={1}>
                                            <Avatar size="xs" name={msg.senderName} />
                                            <Text fontSize="sm" fontWeight="medium">
                                                {msg.senderName}
                                            </Text>
                                            <Badge colorScheme={msg.senderType === 'doctor' ? 'green' : 'blue'}>
                                                {msg.senderType}
                                            </Badge>
                                            <Text fontSize="xs" color="gray.500">
                                                {new Date(msg.timestamp).toLocaleTimeString()}
                                            </Text>
                                        </HStack>
                                        <Box
                                            bg={msg.sender === user?.id ? "blue.500" : "white"}
                                            color={msg.sender === user?.id ? "white" : "black"}
                                            p={3}
                                            borderRadius="lg"
                                            boxShadow="sm"
                                        >
                                            <Text>{msg.content}</Text>
                                        </Box>
                                    </Box>
                                ))}
                                <div ref={messagesEndRef} />
                            </VStack>
                        </Box>

                        {/* Message Input */}
                        <HStack width="100%">
                            <Input
                                flex="1"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your message..."
                                size="lg"
                            />
                            <Tooltip label="Send message">
                                <IconButton
                                    icon={<FiSend />}
                                    onClick={handleSendMessage}
                                    colorScheme="blue"
                                    size="lg"
                                />
                            </Tooltip>
                            <Tooltip label="Refresh messages">
                                <IconButton
                                    icon={<FiRefreshCw />}
                                    onClick={loadMessages}
                                    size="lg"
                                    isLoading={loading}
                                />
                            </Tooltip>
                        </HStack>
                    </VStack>
                </Box>
            </Flex>
        </Box>
    );
};

export default Chat; 