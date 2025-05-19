
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    isVerified: { type: Boolean, default: false },
    otp: String,
    provider: { type: String, enum: ["email", "google"], default: "email" },
    resetPasswordToken: String,
    resetPasswordExpires: Date
  });
  
module.exports = mongoose.model("User", userSchema);
