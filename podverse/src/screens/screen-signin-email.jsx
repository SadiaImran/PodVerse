import { useState } from "react";
import { useNavigate } from 'react-router-dom';

import TopBar from "../components/shared/TopBar.jsx";
import AuthWelcome from "../components/shared/AuthWelcome.jsx";
import AuthButton from "../components/shared/AuthButton.jsx";
import TermsCondition from "../components/comp-signin/Terms&Conditions.jsx";
import RememberMeForgotPass from "../components/comp-signin/Remember&ForgotPass.jsx";
import AccountPrompt from "../components/shared/AccountPrompt.jsx";
import AuthFields from "../components/shared/AuthFields.jsx";
import { FaRegEnvelope, FaGoogle } from "react-icons/fa";
import { MdOutlineLock } from "react-icons/md";
import ImageCarousel from "../components/comp-signin/ImageCarousel.jsx";

import { login } from "../api/auth";

function SignInScreenEmail() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const navigate = useNavigate();

  const handleContinue = async () => {
    try {
      setIsLoading(true);
      await login(email, password, rememberMe);

      navigate("/home");
    } catch (err) {
      const msg = err.response?.data?.msg;

      if (msg === "User not found or not verified") {
        setEmailError("Email not verified or doesn't exist.");
      } else if (msg === "Invalid credentials") {
        setPasswordError("Incorrect email or password.");
      } else {
        setPasswordError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setEmailError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setPasswordError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex flex-col">
      <TopBar />

      <div className="flex flex-col lg:flex-row w-full max-w-6xl mx-auto items-start py-10 lg:py-24 px-4 gap-36">
        {/* Left: Image Carousel */}
        <div className="hidden lg:flex w-1/2 h-[500px]  overflow-hidden">
          <ImageCarousel />
        </div>

        {/* Right: Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center">
          <div className="w-full max-w-lg p-12 rounded-2xl shadow-xl border border-gray-200 bg-white space-y-6">
            {isLoading ? (
              <div className="flex flex-col h-full space-y-4">
                <AuthWelcome title="Welcome Back 👋" subtitle="Signing you in..." />
                <div className="flex flex-1 items-center justify-center flex-col space-y-4 pt-28">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-light-deepPurple border-solid"></div>
                  <p className="text-gray-500 text-sm">Just one second...</p>
                </div>
              </div>
            ) : (
              <>
                <AuthWelcome title="Welcome Back !" subtitle="Sign in to your account" />

                <div className="space-y-6 mt-10">
                  <div className="mt-11">
                  {/* Google Button */}
                  <AuthButton
                    bgColor="bg-red-500"
                    textColor="text-white"
                    borderColor="border-red-500"
                    text="Continue with Google"
                    IconComponent={FaGoogle}
                    isGoogle={true}
                  />
                  </div>
                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-grow h-px bg-gray-400"></div>
                    <p className="text-gray-400 text-center text-sm">Or</p>
                    <div className="flex-grow h-px bg-gray-400"></div>
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <AuthFields
                      type="email"
                      purpose="signin"
                      placeholder="Enter your email"
                      IconComponent={FaRegEnvelope}
                      onChange={handleEmailChange}
                      value={email}
                    />
                    {emailError && (
                      <p className="text-red-500 text-sm">{emailError}</p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <AuthFields
                      type="password"
                      purpose="signin"
                      placeholder="Enter your password"
                      IconComponent={MdOutlineLock}
                      onChange={handlePasswordChange}
                      value={password}
                    />
                    {passwordError && (
                      <p className="text-red-500 text-sm">{passwordError}</p>
                    )}
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <RememberMeForgotPass
                    rememberMe={rememberMe}
                    setRememberMe={setRememberMe}
                  />

                  {/* Continue Button */}
                  <AuthButton
                    bgColor="bg-light-deepPurple"
                    textColor="text-white"
                    borderColor="border-light-deepPurple"
                    text="Continue"
                    onClick={handleContinue}
                  />

                  {/* Terms */}
                  <TermsCondition />
                </div>

                {/* Bottom Prompt */}
                <div className="mt-10 text-center">
                  <AccountPrompt
                    quesText="Don't have an account?"
                    buttonText="Sign up"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignInScreenEmail;
