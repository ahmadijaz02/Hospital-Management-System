import React from 'react';
import ChatLayout from '../shared/ChatLayout';
import Chat from '../chat/Chat';

const DoctorChat = () => {
  return (
    <ChatLayout>
      <Chat userType="doctor" />
    </ChatLayout>
  );
};

export default DoctorChat; 