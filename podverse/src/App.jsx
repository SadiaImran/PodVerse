
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
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SignUpScreen />} />
        <Route path="/signup-email" element={<SignUpScreenEmail />} />
      </Routes>
    </Router>
  );
}

export default App;