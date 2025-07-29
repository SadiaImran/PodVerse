import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/shared/TopBar.jsx';
import AuthWelcome from '../components/shared/AuthWelcome.jsx';
import AuthButton from '../components/shared/AuthButton.jsx';
import TermsCondition from '../components/comp-signin/Terms&Conditions.jsx';
import AccountPrompt from '../components/shared/AccountPrompt.jsx';
import AuthFields from '../components/shared/AuthFields.jsx';
import { FaRegEnvelope, FaPodcast, FaHeadphones, FaRegUser } from 'react-icons/fa';
import { MdOutlineLock, MdWaves, MdCheckCircle } from 'react-icons/md';
import ImageCarousel from '../components/comp-signin/ImageCarousel.jsx';
<<<<<<< HEAD
import { supabase } from '../supabaseClient';
=======
import { supabase } from '../../connection_supabase_client.js';
>>>>>>> 0b713f444b116cd4d55e20dfb96d7956c5cef15d

function SignUpScreenEmail() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState("");

  const navigate = useNavigate();

  const handleContinue = async () => {
    if (!email || !password || !fullName) return alert('Full name, email and password required');

    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });

    setIsLoading(false);

    if (error) {
      alert(error.message);
    } else {
      alert('Check your email for a confirmation link to complete signup.');
      navigate('/home');
    }
  };

  const handleFullNameChange = (e) => setFullName(e.target.value);
  const handleEmailChange = (e) => setEmail(e.target.value);
  const handlePasswordChange = (e) => setPassword(e.target.value);

  const isStrongPassword = (pwd) => {
    return /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(pwd);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-60 h-60 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
        
        {/* Floating Icons */}
        <div className="absolute top-20 left-20 text-purple-400 opacity-20 animate-float">
          <FaPodcast size={24} />
        </div>
        <div className="absolute top-60 right-20 text-indigo-400 opacity-20 animate-float animation-delay-2000">
          <FaHeadphones size={28} />
        </div>
        <div className="absolute bottom-40 left-1/3 text-pink-400 opacity-20 animate-float animation-delay-4000">
          <MdWaves size={32} />
        </div>
      </div>

      <TopBar />
      
      <div className="flex flex-col lg:flex-row w-full max-w-7xl items-center justify-center mx-auto py-10 lg:py-20 px-4 gap-20 relative z-10">
        {/* Left: Image Carousel with Enhanced Design */}
        <div className="hidden lg:flex w-1/2 h-[600px] relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-3xl backdrop-blur-sm"></div>
          <div className="relative z-10 w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-purple-500/20">
            <ImageCarousel />
          </div>
          
          {/* Brand Badge */}
          <div className="absolute -top-4 -left-4 bg-gradient-to-r from-purple-600 to-indigo-600 p-3 rounded-2xl shadow-lg">
            <FaPodcast className="text-white text-2xl" />
          </div>
        </div>

        {/* Right: Auth Form with Enhanced Design */}
        <div className="w-full lg:w-1/2 flex items-center justify-center">
          <div className="w-full max-w-md relative">
            {/* Form Container */}
            <div className="relative bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 space-y-6">
              {/* Gradient Border Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 rounded-3xl blur opacity-20"></div>
              
              <div className="relative z-10">
                {isLoading ? (
                  <div className="flex flex-col h-full space-y-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mb-4">
                        <FaPodcast className="text-white text-2xl" />
                      </div>
                      <AuthWelcome title="Let's Get Started 🚀" subtitle="Creating your account..." />
                    </div>
                    
                    <div className="flex flex-1 items-center justify-center flex-col space-y-6 pt-20">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin animation-delay-150"></div>
                      </div>
                      <p className="text-gray-600 text-sm font-medium">Setting up your PodVerse account...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header with Brand Identity */}
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mb-4 shadow-lg">
                        <FaPodcast className="text-white text-2xl" />
                      </div>
                      <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                        PodVerse
                      </h1>
                      <AuthWelcome title="Let's Get Started!" subtitle="Create your account and join the podcast community" />
                    </div>

                    <div className="space-y-6">
                      {/* Form Fields with Enhanced Design */}
                      <div className="space-y-5">
                        {/* Full Name Field */}
                        <div className="space-y-2">
                          <div className="relative group">
                            <AuthFields
                              type="text"
                              purpose="signin"
                              placeholder="What is your full name?"
                              IconComponent={FaRegUser}
                              onChange={handleFullNameChange}
                              value={fullName}
                              className="w-full py-3 px-4 pl-12 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-gray-50 focus:bg-white"
                            />
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-300">
                              <FaRegUser />
                            </div>
                          </div>
                        </div>

                        {/* Email Field */}
                        <div className="space-y-2">
                          <div className="relative group">
                            <AuthFields
                              type="email"
                              purpose="signin"
                              placeholder="What is your email?"
                              IconComponent={FaRegEnvelope}
                              onChange={handleEmailChange}
                              value={email}
                              className="w-full py-3 px-4 pl-12 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-gray-50 focus:bg-white"
                            />
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-300">
                              <FaRegEnvelope />
                            </div>
                          </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                          <div className="relative group">
                            <AuthFields
                              type="password"
                              purpose="signin"
                              placeholder="Enter your password"
                              IconComponent={MdOutlineLock}
                              onChange={handlePasswordChange}
                              value={password}
                              className="w-full py-3 px-4 pl-12 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-gray-50 focus:bg-white"
                            />
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-300">
                              <MdOutlineLock />
                            </div>
                          </div>

                          {/* Enhanced Password Strength Indicator */}
                          {password.length > 0 && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isStrongPassword(password) 
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 w-full' 
                                        : 'bg-gradient-to-r from-red-500 to-orange-500 w-1/3'
                                    }`}
                                  ></div>
                                </div>
                                {isStrongPassword(password) && (
                                  <MdCheckCircle className="text-green-500 text-lg" />
                                )}
                              </div>
                              
                              {isStrongPassword(password) ? (
                                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                                  <MdCheckCircle className="text-green-500" />
                                  <span>Excellent! Your password is strong and secure.</span>
                                </div>
                              ) : (
                                <div className="text-sm">
                                  <div className="flex items-center gap-2 text-red-600 font-medium mb-1">
                                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                    <span>Password needs improvement</span>
                                  </div>
                                  <p className="text-gray-600 leading-relaxed">
                                    Please choose a password that is at least{' '}
                                    <span className="font-semibold text-gray-800">8 characters long</span> and includes{' '}
                                    <span className="font-semibold text-gray-800">letters, numbers, and symbols</span> for better security.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Continue Button with Enhanced Design */}
                        <div className="pt-4 group">
                          <AuthButton
                            bgColor="bg-gradient-to-r from-purple-600 to-indigo-600"
                            textColor="text-white"
                            borderColor="border-transparent"
                            text="Create PodVerse Account"
                            onClick={handleContinue}
                            className="w-full py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02] transform hover:from-purple-700 hover:to-indigo-700"
                          />
                        </div>

                        {/* Terms */}
                        <div className="pt-2">
                          <TermsCondition />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Prompt with Enhanced Design */}
                    <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                      <AccountPrompt quesText="Already Have an Account?" buttonText="Log in" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUpScreenEmail;