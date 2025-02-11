const AuthButton = ({ bgColor, textColor, borderColor, text, icon }) => {
  return (
    <div className="centered-div">
      <button className={`inline-flex items-center justify-center gap-2 p-4 h-11 w-96 rounded-lg border ${borderColor} ${bgColor} ${textColor} text-base font-normal font-OpenSans leading-6`}>
        <span className="h-5 w-5 font-bold flex items-center justify-center">{icon}</span>
        <span>{text}</span>
      </button>
    </div>
  );
};

export default AuthButton;
