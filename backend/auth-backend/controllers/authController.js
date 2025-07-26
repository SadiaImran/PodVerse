
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendOTP = require("../utils/sendOTP");
const admin = require("../firebase");

// controllers/authController.js
const crypto = require("crypto");
const sendResetLink = require("../utils/sendResetLink"); // we'll create this

exports.sendForgotPasswordLink = async (req, res) => {
    const { email, clientUrl } = req.body; // use clientUrl from request
  
    try {
        const user = await User.findOne({ 
            email: { $regex: new RegExp("^" + email + "$", "i") }
          });
          
      console.log({user});
      if (!user || !user.isVerified)
        return res.status(404).json({ msg: "User not found or not verified" });
  
      const token = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 1000 * 60 * 30; // 30 mins
      await user.save();
  
      const resetURL = `${clientUrl}/reset-password/${token}`;
      await sendResetLink(email, resetURL);
  
      res.json({ msg: "Reset link sent to email." });
    } catch (err) {
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  };
  

exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;
  
    try {
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });
  
      if (!user) return res.status(400).json({ msg: "Invalid or expired token" });
  
      const hashed = await bcrypt.hash(newPassword, 10);
      user.password = hashed;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
  
      res.json({ msg: "Password updated successfully" });
    } catch (err) {
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  };
  
  
  exports.login = async (req, res) => {
    const { email, password, rememberMe } = req.body;
  
    try {
      console.log("Incoming email:", email);
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      console.log({user});
  
      if (!user || !user.isVerified) {
        return res.status(400).json({ msg: "User not found or not verified" });
      }
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: "Invalid credentials" });
      }
  
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: rememberMe ? "7d" : "1d",
      });
  
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true only on HTTPS
        sameSite: "Lax", // "Lax" is safer and works for most redirect flows
        maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
      });
      
  
      res.status(200).json({ msg: "Login successful", user: { email: user.email, name: user.name } });
  
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ msg: "Server error" });
    }
  };
  

  exports.getUserProfile = async (req, res) => {
    try {
      console.log("Fetching profile for userId:", req.userId);
  
      if (!req.userId) {
        return res.status(401).json({ msg: "Unauthorized: No user ID found" });
      }
  
      const user = await User.findById(req.userId).select("email fullName profileUrl");
  
      if (!user) {
        console.log("User not found");
        return res.status(404).json({ msg: "User not found" });
      }
  
      console.log("User profile fetched:", user);
      res.json(user);
    } catch (err) {
      console.error("Error fetching profile:", err);
      res.status(500).json({ msg: "Error fetching user", error: err.message });
    }
  };
  
  exports.authenticate = (req, res) => {
    const token = req.cookies.token;
    console.log("Cookies:", req.cookies);
    console.log("Token:", token);

  
    if (!token) return res.status(401).json({ msg: "Unauthorized" });
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      res.status(200).json({ msg: "Authenticated", userId: decoded.userId }); // ✅ Correct
    } catch (err) {
      return res.status(401).json({ msg: "Invalid token" });
    }
  };

  
  exports.logout = (req, res) => {
    res.clearCookie("token", { httpOnly: true, sameSite: "Strict", secure: process.env.NODE_ENV === "production" });
    res.status(200).json({ msg: "Logged out successfully" });
  };
  
  

  exports.googleLogin = async (req, res) => {
    const { idToken } = req.body;
  
    try {
      // Verify the ID token from Google
      const decoded = await admin.auth().verifyIdToken(idToken);
      const email = decoded.email;
      const fullName = decoded.name || "Google User";
  
      // Check if user exists
      let user = await User.findOne({ email });
  
      if (!user) {
        // Create a new user if not found
        user = new User({
          email,
          fullName,
          isVerified: true,
          provider: "google",
        });
        await user.save();
      } else {
        // Always update name and mark verified if using Google login
        user.fullName = fullName;
        user.isVerified = true;
        await user.save();
      }
  
      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
  
      // Send token in cookie + user info in response body
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "Lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .status(200)
        .json({
          msg: "Login successful",
          token,
          user: {
            email: user.email,
            fullName: user.fullName,
          },
        });
  
    } catch (err) {
      console.error("Google Login Error:", err);
      res.status(500).json({ msg: "Google authentication failed", error: err.message });
    }
  };
  

// POST /send-otp
exports.sendOtpToEmail = async (req, res) => {
  const { email, password, fullName } = req.body; // added fullName

  try {
    const existing = await User.findOne({ email });
    if (existing && existing.isVerified) {
      return res.status(400).json({ msg: "Email already registered" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await sendOTP(email, otp);

    let user = await User.findOne({ email });
    const hashedPassword = await bcrypt.hash(password, 10);

    if (user) {
      // Update existing temp user
      user.otp = otp;
      user.password = hashedPassword;
      user.isVerified = false;
      user.fullName = fullName || user.fullName; // update fullName if provided
      await user.save();
    } else {
      // Create new temp user with fullName
      user = new User({ email, otp, password: hashedPassword, isVerified: false, fullName });
      await user.save();
    }

    res.json({ msg: "OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to send OTP", error: err.message });
  }
};

// POST /verify-otp
exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || user.otp !== otp) return res.status(400).json({ msg: "Invalid OTP" });

        user.isVerified = true;
        user.otp = "";
        await user.save();

        res.json({ msg: "Email verified successfully" });
    } catch (err) {
        res.status(500).json({ msg: "Server error", error: err.message });
    }
};

exports.updateProfile = async (req, res) => {
  try {
    // assuming you have authentication middleware
    console.log("Updating profile for userId:", req.userId);

    const { fullName, profileUrl } = req.body;

    // Update user with new name and profile URL
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      {
        fullName,
        profileUrl,
      },
      { new: true }
    );

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
