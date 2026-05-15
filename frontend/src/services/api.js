import axios from 'axios';

// Create an Axios instance pointing to your Node.js backend
// It uses the VITE_API_URL in production (Render), or falls back to localhost for local dev.
const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', 
});

// Interceptor: Automatically attach the JWT token to every request if the user is logged in
API.interceptors.request.use((req) => {
    const token = localStorage.getItem('token');
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
});

export default API;

// --- API Helper Functions ---

// Auth Routes
export const login = (formData) => API.post('/auth/login', formData);
export const register = (formData) => API.post('/auth/register', formData);

// Interview Routes
export const startInterview = (formData) => API.post('/interviews/start', formData);
export const submitAnswer = (interviewId, question, userAnswer, userCode = '') => 
    API.post(`/interviews/${interviewId}/answer`, { question, userAnswer, userCode });
export const getMyInterviews = () => API.get('/interviews');
export const getInterview = (interviewId) => API.get(`/interviews/${interviewId}`);