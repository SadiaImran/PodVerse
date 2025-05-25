const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  fullName: { type: String }, 
  email: { type: String, unique: true },
  password: String,
  isVerified: { type: Boolean, default: false },
  otp: String,
  provider: { type: String, enum: ["email", "google"], default: "email" },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  profileUrl: {
    type: String,
    default: "https://example.com/default-profile.png" 
  },
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
