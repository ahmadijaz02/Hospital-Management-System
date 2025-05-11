import axios from 'axios';

const API_URL = process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:4000';

const instance = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add a request interceptor
instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// Add a response interceptor
instance.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('Response error details:', error.response || error);
        return Promise.reject(error);
    }
);

export default instance; 