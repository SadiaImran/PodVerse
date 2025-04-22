import { useNavigate } from 'react-router-dom';
import TopBar from "../components/shared/TopBar.jsx";
import AuthWelcome from "../components/shared/AuthWelcome.jsx";
import AuthButton from "../components/shared/AuthButton.jsx";
import TermsCondition from "../components/comp-signin/Terms&Conditions.jsx";
import AccountPrompt from "../components/shared/AccountPrompt.jsx";
import mediaPerson from "../assets/images/image.png";
import { FaRegEnvelope , FaGoogle , FaFacebookF , FaApple } from "react-icons/fa";

function SignInScreen(){
    const navigate = useNavigate()

    return(
        <div className="min-h-screen bg-white flex flex-col">
            <TopBar/>
            <div className="flex flex-col lg:flex-row w-full max-w-6xl mx-auto items-start py-10 lg:py-32 px-4 gap-10">
                <div className="hidden lg:flex w-1/2 justify-center self-start">
                    <img
                    src={mediaPerson}
                    alt="Illustration"
                    className="w-[90%] max-w-xl"
                    />
                </div>
                <div className="w-full max-w-lg min-h-[540px] border rounded-lg border-gray-200 shadow-md p-8 flex flex-col justify-between mx-auto mt-[-15px]">
                    <AuthWelcome title="Welcome back &#x1F44B;" subtitle="Log in your account" />
                    <div className="space-y-6 mt-12">
                        <AuthButton
                            bgColor="bg-light-deepPurple"
                            textColor="text-white"
                            borderColor="border-light-deepPurple"
                            text="Log in with Email"
                            IconComponent={FaRegEnvelope}
                            onClick={() => navigate('/signin-email')} // navigate on click
                        />
                        <AuthButton
                            bgColor="bg-white-500"
                            textColor="text-red-500"
                            borderColor="border-red-500"
                            text="Log in with Google"
                            IconComponent={FaGoogle}
                        />
                        <TermsCondition />
                    </div>
                    <div className="mt-20">
                        <AccountPrompt quesText="Don't have an account?" buttonText="Sign up" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SignInScreen;
