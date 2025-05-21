// utils/sendResetLink.js
const nodemailer = require("nodemailer");

const sendResetLink = async (email, link) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const info = await transporter.sendMail({
    from: `"PodVerse" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset your PodVerse password",
    html: `<p>Click the link below to reset your password:</p>
           <a href="${link}">${link}</a>
           <p>This link will expire in 30 minutes.</p>`
  });

  console.log("Reset email sent:", info.response);
};

module.exports = sendResetLink;
