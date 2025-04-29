
import { FaRegEnvelope , FaGoogle , FaFacebookF , FaApple } from "react-icons/fa";
import { MdOutlineLock } from "react-icons/md";

import AuthWelcome from "./components/shared/AuthWelcome"
import AccountPrompt from "./components/shared/AccountPrompt"
import TermsCondition from "./components/comp-signin/Terms&Conditions"
import RememberMeForgotPass from "./components/comp-signin/Remember&ForgotPass";
import AuthFields from "./components/shared/AuthFields";
import AuthButton from "./components/shared/AuthButton";
import AuthCarousel from "./components/shared/AuthCarousel";
import TopBar from "./components/shared/TopBar";
import SignUpScreen from "./screens/screen-signup";
import SignUpScreenEmail from "./screens/screen-signup-email";
import EmailVerification from "./components/popups/popup-verify-code";
import SignInScreen from "./screens/screen-signin";
import SignInScreenEmail from "./screens/screen-signin-email";
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomeScreen from "./screens/screen-home";

function App() {
  return (
    <div className="bg-light-cream h-screen w-screen">
      <Router>
      <Routes>
        <Route path="/" element={<SignInScreen />} />
        <Route path="/signin-email" element={<SignInScreenEmail />} />
        <Route path="/signup" element={<SignUpScreen />} />
        <Route path="/signup-email" element={<SignUpScreenEmail />} />
        <Route path="/home" element={<HomeScreen/>}></Route>
      </Routes>
      </Router>
    </div>
  );
}
export default App;