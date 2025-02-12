import AuthButton from "./components/shared/AuthButton";
import { FaRegEnvelope } from "react-icons/fa";
import { FaGoogle } from "react-icons/fa";
import { FaFacebookF } from "react-icons/fa";
import AuthWelcome from "./components/shared/AuthWelcome"
import AccountPrompt from "./components/shared/AccountPrompt"
import TermsCondition from "./components/comp-signin/Terms&Conditions"
import AuthCarousel from "./components/shared/AuthCarousel";
import TopBar from "./components/shared/TopBar";

function App() {
  return (
    <>
      <AuthWelcome title="Let&apos;s Get Started &#x1F680;" subtitle="Sign up your account"></AuthWelcome>
      <AuthWelcome title="Welcome back &#128075;" subtitle="Log in your account"></AuthWelcome>
      <AccountPrompt quesText = "Don't Have an account ?" buttonText="Sign up"></AccountPrompt>
      <AccountPrompt quesText = "Already Have an Account ?" buttonText="Log in"></AccountPrompt>
      <TermsCondition></TermsCondition>
      <AuthButton
        bgColor="bg-primary-500"
        textColor="text-white"
        borderColor="border-primary-500"
        text="Log in with Email"
        IconComponent={FaRegEnvelope}
      />
      <AuthButton
        bgColor="bg-primary-500"
        textColor="text-white"
        borderColor="border-primary-500"
        text="Sign Up with Email"
        IconComponent={FaRegEnvelope}
      />
      <AuthButton
        bgColor="bg-white-500"
        textColor="text-red-500"
        borderColor="border-red-500"
        text="Log in with Google"
        IconComponent={FaGoogle}
      />
      <AuthButton
        bgColor="bg-white-500"
        textColor="text-red-500"
        borderColor="border-red-500"
        text="Sign Up with Google"
        IconComponent={FaGoogle}
      />
      <AuthButton
        bgColor="bg-white-500"
        textColor="text-blue-600"
        borderColor="border-blue-600"
        text="Log in with Facebook"
        IconComponent={FaFacebookF}
      />
      <AuthButton
        bgColor="bg-white-500"
        textColor="text-blue-600"
        borderColor="border-blue-600"
        text="Sign Up with Facebook"
        IconComponent={FaFacebookF}
      />
      <TopBar></TopBar>
      <AuthCarousel></AuthCarousel>
    </>
  );
}

export default App;