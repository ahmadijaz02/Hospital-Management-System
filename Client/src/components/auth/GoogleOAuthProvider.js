import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
    console.error('REACT_APP_GOOGLE_CLIENT_ID is not set in .env file');
}

const GoogleAuthProvider = ({ children }) => {
    if (!GOOGLE_CLIENT_ID) {
        return (
            <div style={{ color: 'red', padding: '20px' }}>
                Error: Google Client ID is not configured. Please check your .env file.
            </div>
        );
    }

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            {children}
        </GoogleOAuthProvider>
    );
};

export default GoogleAuthProvider; 