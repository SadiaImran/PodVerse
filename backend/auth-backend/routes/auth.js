const express = require("express");
const router = express.Router();
const {
  verifyOTP,
  login,
  googleLogin,
  sendOtpToEmail,
  sendForgotPasswordLink,
  resetPassword,
  authenticate,
  logout,
  getUserProfile,
  updateProfile,
} = require("../controllers/authController");

// Existing routes
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/google-login", googleLogin);
router.post("/send-otp", sendOtpToEmail);
router.post("/forgot-password", sendForgotPasswordLink);
router.post("/reset-password/:token", resetPassword);

// New routes
router.get("/authenticate", authenticate); // Optional: for checking login status
router.post("/logout", logout); // ✅ Add this route
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/multer");


router.get("/profile", authMiddleware, getUserProfile);
router.put("/update-profile", authMiddleware, updateProfile); 
module.exports = router;
