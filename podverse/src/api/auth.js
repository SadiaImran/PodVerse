import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api/auth', // Update this if deployed
});

export const sendOtpToEmail = (email, password, fullName) =>
  API.post('/send-otp', { email, password, fullName });


// Verify OTP
export const verifyOTP = (email, otp) => API.post('/verify-otp', { email, otp });

// Login
export const login = (email, password, rememberMe) =>
  API.post('/login', {email, password, rememberMe}, { withCredentials: true });

// Google Login
export const googleLogin = (idToken) => API.post('/google-login', { idToken });

export const sendForgotPasswordLink = (email, clientUrl) => API.post('/forgot-password', { email, clientUrl });


export const sendResetLink = (token, newPassword) => API.post(`/reset-password/${token}`, { newPassword });

export const logout = () => API.post('/logout', {}, { withCredentials: true });
export const authenticate = () => API.get('/authenticate', { withCredentials: true });
export const getUserProfile = async () => {
  try {
    const response = await API.get('/profile', { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error("Error fetching user profile:", error.response?.data || error.message);
    throw error;
  }
};

