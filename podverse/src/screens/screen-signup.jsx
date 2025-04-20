import TopBar from "../components/shared/TopBar.jsx";
import AuthWelcome from "../components/shared/AuthWelcome.jsx";
import AuthButton from "../components/shared/AuthButton.jsx";
import TermsCondition from "../components/comp-signin/Terms&Conditions.jsx";
import AccountPrompt from "../components/shared/AccountPrompt.jsx";
import mediaPerson from "../assets/images/image.png";
import { FaRegEnvelope , FaGoogle , FaFacebookF , FaApple } from "react-icons/fa";


function SignUpScreen(){
    return(
        <div className="min-h-screen bg-white flex flex-col">
            <TopBar/>
            <div className="flex flex-col lg:flex-row w-full max-w-6xl mx-auto items-center py-10 lg:py-32 px-4 gap-10">
                <div className="hidden lg:flex w-1/2 justify-center">
                    <img
                    src={mediaPerson}
                    alt="Illustration"
                    className="w-[90%] max-w-xl"
                    />
                </div>
                <div className="w-full max-w-lg min-h-[540px] border rounded-lg border-gray-200 shadow-md p-16 flex flex-col justify-between mx-auto">
                    <AuthWelcome title="Let&apos;s Get Started &#x1F680;" subtitle="Sign up your account"></AuthWelcome>
                    <div className="space-y-6 mt-12">
                    <AuthButton
                        bgColor="bg-light-deepPurple"
                        textColor="text-white"
                        borderColor="border-light-deepPurple"
                        text="Sign Up with Email"
                        IconComponent={FaRegEnvelope}
                    />
                    <AuthButton
                        bgColor="bg-white-500"
                        textColor="text-red-500"
                        borderColor="border-red-500"
                        text="Sign Up with Google"
                        IconComponent={FaGoogle}
                    />
                    <TermsCondition></TermsCondition>
                    </div>
                    <div className="mt-20">
                        <AccountPrompt quesText = "Already Have an Account ?" buttonText="Log in"></AccountPrompt>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default SignUpScreen;