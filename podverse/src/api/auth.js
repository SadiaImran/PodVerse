import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api/auth', // Update this if deployed
});

export const sendOtpToEmail = (email, password) => API.post('/send-otp', { email,password });

// Verify OTP
export const verifyOTP = (email, otp) => API.post('/verify-otp', { email, otp });

// Login
export const login = (email, password) => API.post('/login', { email, password });

// Google Login
export const googleLogin = (idToken) => API.post('/google-login', { idToken });

export const sendForgotPasswordLink = (email, clientUrl) => API.post('/forgot-password', { email, clientUrl });


export const sendResetLink = (token, newPassword) => API.post(`/reset-password/${token}`, { newPassword });


