import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import TopBar from "../components/shared/TopBar.jsx";
import AuthWelcome from "../components/shared/AuthWelcome.jsx";
import AuthButton from "../components/shared/AuthButton.jsx";
import TermsCondition from "../components/comp-signin/Terms&Conditions.jsx";
import RememberMeForgotPass from "../components/comp-signin/Remember&ForgotPass.jsx";
import AccountPrompt from "../components/shared/AccountPrompt.jsx";
import AuthFields from "../components/shared/AuthFields.jsx";
import mediaPerson from "../assets/images/image.png";
import { FaRegEnvelope } from "react-icons/fa";
import { MdOutlineLock } from "react-icons/md";

import { login } from "../api/auth"; // import


function SignInScreenEmail() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const navigate = useNavigate();

  const handleContinue = async () => {
    try {
      setIsLoading(true);
      const res = await login(email, password);
      localStorage.setItem("token", res.data.token);
      navigate("/home");
    } catch (err) {
      if (err.response?.data?.msg === "User not found or not verified") {
        setEmailError("Email not verified or doesn't exist.");
      } else {
        setPasswordError("Incorrect password.");
      }
    } finally {
      setIsLoading(false);
    }
  };


  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setEmailError(""); // Clear error on change
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setPasswordError(""); // Clear error on change
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
              <AuthWelcome
                title="Welcome Back 👋"
                subtitle="Signing you in..."
              />
              <div className="flex flex-1 items-center justify-center flex-col space-y-4 pt-28">
                <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-light-deepPurple border-solid"></div>
                <p className="text-gray-500 text-sm">Just one second...</p>
              </div>
            </div>
          ) : (
            <>
              <AuthWelcome
                title="Welcome Back 👋"
                subtitle="Sign in to your account"
              />
              <div className="space-y-6 mt-12">
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

                <RememberMeForgotPass/>
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
                  quesText="Don't have an account?"
                  buttonText="Sign up"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SignInScreenEmail;
