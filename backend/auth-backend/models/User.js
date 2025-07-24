const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
<<<<<<< HEAD
<<<<<<< HEAD
=======
  fullName: { type: String }, 
>>>>>>> 16c741c9d22d80cef982a17e96ba15788da19171
=======
  fullName: { type: String }, 
>>>>>>> reconfigure-1-SI
  email: { type: String, unique: true },
  password: String,
  isVerified: { type: Boolean, default: false },
  otp: String,
  provider: { type: String, enum: ["email", "google"], default: "email" },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> reconfigure-1-SI
  profileUrl: {
    type: String,
    default: "https://example.com/default-profile.png" 
  },
<<<<<<< HEAD
>>>>>>> 16c741c9d22d80cef982a17e96ba15788da19171
=======
>>>>>>> reconfigure-1-SI
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
