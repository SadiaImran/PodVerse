import AuthButton from "./components/comp-signin/AuthButton";
import { FaRegEnvelope } from "react-icons/fa";
import { FaGoogle } from "react-icons/fa";
import { FaFacebookF } from "react-icons/fa";

function App() {
  return (
    <>
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
    </>
  );
}

export default App;