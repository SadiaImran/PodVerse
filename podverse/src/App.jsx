import AuthWelcome from "./components/shared/AuthWelcome"
import AccountPrompt from "./components/shared/AccountPrompt"
import TermsCondition from "./components/comp-signin/Terms&Conditions"

function App() {
  
  return (
    <>
      <AuthWelcome title="Let&apos;s Get Started &#x1F680;" subtitle="Sign up your account"></AuthWelcome>
      <AuthWelcome title="Welcome back &#128075;" subtitle="Log in your account"></AuthWelcome>
      <AccountPrompt quesText = "Don't Have an account ?" buttonText="Sign up"></AccountPrompt>
      <AccountPrompt ></AccountPrompt>
      <TermsCondition></TermsCondition>
    </>
  )
}

export default App
