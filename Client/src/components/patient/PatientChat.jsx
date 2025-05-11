import React from 'react';
import ChatLayout from '../shared/ChatLayout';
import Chat from '../chat/Chat';

const PatientChat = () => {
  return (
    <ChatLayout>
      <Chat userType="patient" />
    </ChatLayout>
  );
};

export default PatientChat; 