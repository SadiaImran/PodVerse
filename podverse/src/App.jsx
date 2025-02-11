import LetsGetStarted from "./components/comp-signup/LetsGetStarted"
import WelcomeBack from "./components/comp-signin/WelcomeBack"
import AlreadyHaveAnAccount from "./components/comp-signup/AlreadyHaveAnAccount"
import TermsCondition from "./components/comp-signin/Terms&Conditions"

function App() {
  
  return (
    <>
      <LetsGetStarted></LetsGetStarted>
      <WelcomeBack></WelcomeBack>
      <AlreadyHaveAnAccount></AlreadyHaveAnAccount>
      <TermsCondition></TermsCondition>
    </>
  )
}

export default App
