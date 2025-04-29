function RememberMeForgotPass() {
    return (
      <div className="centered-div flex items-center justify-between w-full font-OpenSans font-medium text-sm leading-6">
        <label className="flex items-center gap-2 text-gray-700 text-sm font-OpenSans cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded-sm accent-primary-500 cursor-pointer" />
          Remember me
        </label>
        <button className="text-primary-500">
          Forgot password?
        </button>
      </div>
    );
  }
  
  export default RememberMeForgotPass;
