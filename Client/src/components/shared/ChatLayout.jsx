import React from 'react';
import { Box, Container } from '@chakra-ui/react';
import Layout from './Layout';

const ChatLayout = ({ children }) => {
  return (
    <Layout>
      <Container maxW="container.xl" py={6}>
        <Box
          bg="white"
          borderRadius="lg"
          boxShadow="sm"
          overflow="hidden"
          height="calc(100vh - 150px)"
        >
          {children}
        </Box>
      </Container>
    </Layout>
  );
};

export default ChatLayout; 