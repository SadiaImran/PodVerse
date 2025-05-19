
const express = require("express");
const router = express.Router();
const {verifyOTP, login, googleLogin, sendOtpToEmail, sendForgotPasswordLink, resetPassword } = require("../controllers/authController");

router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/google-login", googleLogin);
router.post('/send-otp', sendOtpToEmail);
router.post("/forgot-password", sendForgotPasswordLink);
router.post("/reset-password/:token", resetPassword);


module.exports = router;
