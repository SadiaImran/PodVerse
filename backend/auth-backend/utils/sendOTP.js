// utils/sendOTP.js
const nodemailer = require("nodemailer");

const sendOTP = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"PodVerse" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your PodVerse OTP Code",
      html: `<h2>Your OTP is: <b>${otp}</b></h2>`,
    });

    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error; // <== VERY IMPORTANT: Let the error bubble up
  }
};

module.exports = sendOTP;
