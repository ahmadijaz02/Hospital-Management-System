import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <Flex h="100vh">
      <Sidebar />
      <Box flex="1" p={8} bg="gray.50" overflowY="auto">
        {children}
      </Box>
    </Flex>
  );
};

export default Layout; 