import { useNavigate } from "react-router-dom";
function RememberMeForgotPass({ rememberMe, setRememberMe }) {
  const navigate = useNavigate();

  return (
    <div className="centered-div flex items-center justify-between w-full font-OpenSans font-medium text-sm leading-6">
      <label className="flex items-center gap-2 text-gray-700 text-sm font-OpenSans cursor-pointer">
        <input
          type="checkbox"
          className="w-4 h-4 rounded-sm accent-primary-500 cursor-pointer"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        Remember me
      </label>
      <button
        className="text-primary-500"
        onClick={() => navigate("/forgot-password")}
      >
        Forgot password?
      </button>
    </div>
  );
}

export default RememberMeForgotPass;
