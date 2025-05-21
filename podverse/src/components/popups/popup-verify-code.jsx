import { useState, useRef, useEffect } from "react";
import { IoMdClose } from "react-icons/io";

import { verifyOTP } from "../../api/auth"; // add this



export default function EmailVerification({ email,onClose, onVerified}) {

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputs = useRef([]);

  const handleVerify = async () => {
    const code = otp.join("");
    try {
      await verifyOTP(email, code); // pass email and OTP
      setIsVerified(true);
      setError("");
      alert("Email verified! You can now log in.");
      onVerified();
      onClose(); // close popup
    } catch (err) {
      setError("Incorrect code or expired.");
    }
  };

  useEffect(() => {
    const countdown = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(countdown);
  }, []);

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="relative w-full max-w-md p-8 bg-white rounded-xl shadow-lg text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-black"
        >
          <IoMdClose size={22} />
        </button>

        <h2 className="text-2xl font-semibold mb-2">Almost done</h2>
        <p className="text-gray-500 mb-6">
          Please type the code we sent you in your email
        </p>

        <div className="flex justify-center gap-2 mb-4">
          {otp.map((digit, index) => (
            <input
              key={index}
              type="text"
              maxLength="1"
              className="w-12 h-12 text-xl text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={digit}
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              ref={(el) => (inputs.current[index] = el)}
            />
          ))}
        </div>

        {error && <p className="text-red-500 mb-2 text-sm">{error}</p>}

        <button
          onClick={handleVerify}
          className={`w-full py-3 rounded-md font-medium text-white transition-all ${
            isVerified ? "bg-green-500" : "bg-gray-400"
          }`}
        >
          Verify
        </button>

        <p className="mt-4 text-gray-500 text-sm">
          {`0${Math.floor(timer / 60)}:${(timer % 60)
            .toString()
            .padStart(2, "0")}`}
        </p>

        <p className="text-sm text-gray-600 mt-3">
          Can’t access your email?{" "}
          <span className="font-semibold text-black cursor-pointer hover:underline">
            Contact support
          </span>
        </p>
      </div>
    </div>
  );
}
