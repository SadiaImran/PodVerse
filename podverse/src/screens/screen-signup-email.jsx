import { useState } from "react";
import TopBar from "../components/shared/TopBar.jsx";
import AuthWelcome from "../components/shared/AuthWelcome.jsx";
import AuthButton from "../components/shared/AuthButton.jsx";
import TermsCondition from "../components/comp-signin/Terms&Conditions.jsx";
import AccountPrompt from "../components/shared/AccountPrompt.jsx";
import AuthFields from "../components/shared/AuthFields.jsx";
import EmailVerification from "../components/popups/popup-verify-code.jsx";
import mediaPerson from "../assets/images/image.png";
import { FaRegEnvelope, FaGoogle, FaFacebookF, FaApple } from "react-icons/fa";
import { MdOutlineLock } from "react-icons/md";
import { sendOtpToEmail } from "../api/auth"; 
import { useNavigate } from "react-router-dom";





function SignUpScreenEmail() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  
  const navigate = useNavigate();

  const handleFinalSignup = async () => {
    setIsLoading(true);
    setSignupComplete(true);
    setTimeout(() => {
      navigate("/home");
    }, 1000);
  };
  

  const handleContinue = async () => {
    if (!email || !password) return alert("Email and password required");
  
    try {
      await sendOtpToEmail(email, password);  // send both email and password
      setShowVerification(true);
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to send OTP");
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
  };

  const isStrongPassword = (pwd) => {
    return /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(pwd);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <TopBar />
      <div className="flex flex-col lg:flex-row w-full max-w-6xl mx-auto items-start py-10 lg:py-32 px-4 gap-10">
        <div className="hidden lg:flex w-1/2 justify-center self-start">
          <img
            src={mediaPerson}
            alt="Illustration"
            className="w-[90%] max-w-xl"
          />
        </div>

        <div className="w-full max-w-lg min-h-[540px] border rounded-lg border-gray-200 shadow-md p-8 flex flex-col justify-between mx-auto mt-[-15px]">
          {isLoading ? (
            <div className="flex flex-col h-full space-y-4">
            {/* Keep welcome text at top */}
            <AuthWelcome
                title="Let's Get Started 🚀"
                subtitle="Signing you up..."
            />

            <div className="flex flex-1 items-center justify-center flex-col space-y-4 pt-28">
            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-light-deepPurple border-solid"></div>
            <p className="text-gray-500 text-sm">Just one second...</p>
            </div>

            </div>

          ) : (
            <>
              <AuthWelcome
                title="Let&apos;s Get Started 🚀"
                subtitle="Sign up your account"
              />
              <div className="space-y-6 mt-12">
                <AuthFields
                  type="email"
                  purpose="signin"
                  placeholder="What is your email?"
                  IconComponent={FaRegEnvelope}
                  onChange={handleEmailChange}
                  value={email}
                />

                <AuthFields
                  type="password"
                  purpose="signin"
                  placeholder="Enter your password"
                  IconComponent={MdOutlineLock}
                  onChange={handlePasswordChange}
                  value={password}
                />

                {password.length > 0 && (
                  <div className="text-sm mt-[-20px]">
                    <div
                      className={`h-2 rounded-full mt-2 ${
                        isStrongPassword(password)
                          ? "bg-green-500 w-full"
                          : "bg-red-500 w-1/3"
                      }`}
                    ></div>
                    {isStrongPassword(password) ? (
                      <p className="text-green-600 font-semibold mt-2">
                        Great job! Your password is strong.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-1">
                        <p>
                          <span className="text-red-500 font-medium">
                            Your password is weak.{" "}
                          </span>
                          <span className="text-gray-500">
                            Please choose a password that is at least{" "}
                          </span>
                          <span className="text-black font-medium">
                            8 characters long (letters, numbers, and symbols)
                          </span>{" "}
                          <span className="text-gray-500">
                            to make it more secure.
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <AuthButton
                  bgColor="bg-light-deepPurple"
                  textColor="text-white"
                  borderColor="border-light-deepPurple"
                  text="Continue"
                  onClick={handleContinue}
                />

                <TermsCondition />
              </div>

              <div className="mt-20">
                <AccountPrompt
                  quesText="Already Have an Account ?"
                  buttonText="Log in"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {showVerification && (
  <EmailVerification 
    email={email} 
    onClose={() => setShowVerification(false)}
    onVerified={handleFinalSignup}
  />
)}
    </div>
  );
}

export default SignUpScreenEmail;
