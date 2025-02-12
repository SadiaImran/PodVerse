import PropTypes from 'prop-types';

const AuthButton = ({ bgColor, textColor, borderColor, text, IconComponent, ...props }) => {
  return (
    <div className="centered-div">
      <button
        className={`inline-flex items-center justify-center gap-2 p-4 h-11 w-96 rounded-lg border ${borderColor} ${bgColor} ${textColor} border-[1.5px] text-base font-normal font-OpenSans leading-6`}
        {...props}
      >
        {<IconComponent />}
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
  IconComponent: PropTypes.elementType.isRequired,
};

export default AuthButton;