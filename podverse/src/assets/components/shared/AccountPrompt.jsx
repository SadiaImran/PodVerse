import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

function AccountPrompt(props) {
  const navigate = useNavigate();

  const handleNavigation = () => {
    if (props.buttonText.toLowerCase().includes('sign up')) {
      navigate('/signup-email');
    } else if (props.buttonText.toLowerCase().includes('log in')) {
      navigate('/');
    }
  };

  return (
    <div className="centered-div text-center">
      <h4 className="text-sm text-neutral-900 font-bodyRoboto font-medium">
        {props.quesText}
        <button 
          onClick={handleNavigation}
          className="text-light-deepPurple font-bold ml-1"
        >
          {props.buttonText}
        </button>
      </h4>
    </div>
  );
}

AccountPrompt.propTypes = {
  quesText: PropTypes.string,
  buttonText: PropTypes.string,
};

export default AccountPrompt;
