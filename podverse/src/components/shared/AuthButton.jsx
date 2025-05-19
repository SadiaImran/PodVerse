import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from "../../firebase";
import { googleLogin } from "../../api/auth";

const AuthButton = ({ 
  bgColor, 
  textColor, 
  borderColor, 
  text, 
  IconComponent, 
  onClick, 
  isGoogle = false 
}) => {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();  // Fixed typo: `result ho.user` → `result.user`
      const res = await googleLogin(idToken);
      localStorage.setItem("token", res.data.token);
      navigate("/home");
    } catch (err) {
      console.error("Google login failed", err);
    }
  };

  const handleClick = isGoogle ? handleGoogleLogin : onClick;

  return (
    <div className="flex justify-center">
      <button
        className={`inline-flex items-center justify-center gap-2 p-4 h-11 w-full rounded-lg border ${borderColor} ${bgColor} ${textColor} border-[1.5px] text-base font-normal font-bodyRoboto leading-6`}
        onClick={handleClick}
      >
        {IconComponent && <IconComponent />}
        <span>{text}</span>
      </button>
    </div>
  );
};

AuthButton.propTypes = {
  bgColor: PropTypes.string.isRequired,
  textColor: PropTypes.string.isRequired,
  borderColor: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  IconComponent: PropTypes.elementType,
  onClick: PropTypes.func,
  isGoogle: PropTypes.bool,
};

export default AuthButton;
