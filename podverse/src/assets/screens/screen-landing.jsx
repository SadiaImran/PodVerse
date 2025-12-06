import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPodcast, 
  FaRocket,
  FaPlay,
  FaTwitter,
  FaFacebook,
  FaLinkedin,
  FaArrowRight,
  FaBars,
  FaTimes,
  FaCheck,
  FaChevronDown,
  FaArrowUp
} from 'react-icons/fa';
import { MdVideoLibrary } from 'react-icons/md';
import { 
  Mic, 
  Video, 
  Users,
  Wand2,
  Radio,
  Sparkles,
  Zap
} from 'lucide-react';

// Import actual images and video
import banner1 from '../images/banner-1.png';
import aiTechVideo from '../images/AI Tech Insights.mp4';

// Unified color palette
const colors = {
  primary: '#7C3AED',      // Vibrant purple
  primaryDark: '#5B21B6',  // Darker purple
  primaryLight: '#A78BFA', // Light purple
  accent: '#8B5CF6',       // Accent purple
  bg: '#FAF5FF',           // Very light purple bg
  text: '#1F2937',         // Dark gray text
  textMuted: '#6B7280',    // Muted text
};

function LandingPage() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <Mic className="w-7 h-7" />,
      title: "AI Recording Studio",
      description: "LiveKit-powered multi-speaker recording with real-time monitoring and instant cloud sync.",
    },
    {
      icon: <Radio className="w-7 h-7" />,
      title: "Audio Editing Suite",
      description: "Professional waveform editing with trim, fades, EQ, and multi-track mixing.",
    },
    {
      icon: <Video className="w-7 h-7" />,
      title: "Video Generation",
      description: "Create stunning AI avatar videos with B-roll, branding, and auto-captions.",
    },
    {
      icon: <MdVideoLibrary className="w-7 h-7" />,
      title: "Video Editor",
      description: "Timeline editing with overlays, stock media, and Remotion rendering.",
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: "Social Feed",
      description: "Share podcasts with the community. Get likes, comments, and AI summaries.",
    },
    {
      icon: <Wand2 className="w-7 h-7" />,
      title: "Voice Cloning",
      description: "Clone your voice or pick AI tones for seamless content generation.",
    }
  ];

  const steps = [
    {
      title: "Set Up & Record",
      description: "Configure your avatar, voice, and start recording with multi-speaker support.",
      icon: <Mic className="w-8 h-8" />,
    },
    {
      title: "Edit & Generate",
      description: "Polish your audio, add effects, and generate professional avatar videos.",
      icon: <Sparkles className="w-8 h-8" />,
    },
    {
      title: "Publish & Share",
      description: "Post to your feed with AI summaries and engage with your audience.",
      icon: <Zap className="w-8 h-8" />,
    }
  ];

  const faqs = [
    {
      question: "How does the recording studio work?",
      answer: "PodVerse uses LiveKit for real-time, multi-speaker recording with instant sync to cloud storage. Monitor audio levels live and capture high-quality audio from multiple participants."
    },
    {
      question: "Can I edit my podcast after recording?",
      answer: "Absolutely! PodVerse includes a full audio editing suite with waveform editing, trim, fades, EQ, and multi-track mixing. Plus a video editor with timeline editing and Remotion rendering."
    },
    {
      question: "How do AI avatar videos work?",
      answer: "Our video generation creates professional avatar videos from your audio. Choose avatar styles, add B-roll, branding, and captions. All transcripts are saved automatically."
    },
    {
      question: "What is the Social Feed?",
      answer: "Share your podcasts, videos, and clips with the community. Get likes, comments, and AI-generated summaries to help listeners discover your content."
    },
    {
      question: "Can I clone my voice?",
      answer: "Yes! Clone your own voice, pick from AI tones, or swap speaker voices for generation and editing workflows."
    }
  ];

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden" style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}>
      {/* Navigation Bar */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-purple-100/50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <motion.div 
              className="cursor-pointer flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate('/')}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)` }}
              >
                <FaPodcast className="text-lg" />
              </div>
              <span 
                className="text-2xl font-bold"
                style={{ color: colors.primary }}
              >
                PodVerse
              </span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {['About', 'Features', 'How It Works', 'Pricing'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-gray-600 hover:text-purple-600 font-medium transition-colors text-sm"
                >
                  {item}
                </a>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <motion.button 
                onClick={() => navigate('/signin-email')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-2.5 text-purple-600 font-semibold rounded-full hover:bg-purple-50 transition-all"
              >
                Sign In
              </motion.button>
              <motion.button 
                onClick={() => navigate('/signup-email')}
                whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -10px rgba(124, 58, 237, 0.4)' }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-2.5 text-white font-semibold rounded-full transition-all flex items-center gap-2 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
              >
                Get Started
                <FaArrowRight className="text-xs" />
              </motion.button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
            >
              {isMobileMenuOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
            </button>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden border-t border-purple-100 py-4"
              >
                <div className="flex flex-col gap-2">
                  {['About', 'Features', 'How It Works', 'Pricing'].map((item) => (
                <a 
                      key={item}
                      href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                      className="px-4 py-3 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition-colors"
                    >
                      {item}
                    </a>
                  ))}
                  <div className="pt-4 mt-2 border-t border-purple-100 flex flex-col gap-2">
                    <button
                      onClick={() => { navigate('/signin-email'); setIsMobileMenuOpen(false); }}
                      className="w-full py-3 text-purple-600 font-semibold rounded-full border-2 border-purple-200 hover:bg-purple-50 transition-all"
                  >
                    Sign In
                    </button>
                    <button
                      onClick={() => { navigate('/signup-email'); setIsMobileMenuOpen(false); }}
                      className="w-full py-3 text-white font-semibold rounded-full transition-all"
                      style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
                  >
                    Get Started
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section id="about" className="pt-32 lg:pt-40 pb-20 px-6 relative overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            className="w-full h-full object-cover opacity-[0.04]"
            loop
            muted
            autoPlay
            playsInline
          >
            <source src={aiTechVideo} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/95 to-white" />
        </div>

        {/* Static Bubble Circles */}
        <div 
          className="absolute top-20 right-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ backgroundColor: colors.primaryLight, opacity: 0.15 }}
        />
        <div 
          className="absolute bottom-20 left-20 w-[450px] h-[450px] rounded-full pointer-events-none"
          style={{ backgroundColor: colors.primary, opacity: 0.12 }}
        />
        <div 
          className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full pointer-events-none"
          style={{ backgroundColor: colors.accent, opacity: 0.08 }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Text Content */}
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="text-center lg:text-left"
            >
              {/* Badge */}
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                AI-Powered Podcast Platform
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] mb-6"
              >
                <span className="text-gray-800">Create </span>
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
                >
                  Amazing
                </span>
                    <br />
                <span className="text-gray-800">Podcasts with </span>
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 100%)` }}
                >
                  AI
                </span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg lg:text-xl text-gray-600 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0"
              >
                Transform your ideas into professional podcasts. Record, edit, generate AI videos, and share—all in one powerful platform.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
                <motion.button 
                  onClick={() => navigate('/signup-email')}
                  whileHover={{ scale: 1.03, boxShadow: '0 25px 50px -12px rgba(124, 58, 237, 0.4)' }}
                  whileTap={{ scale: 0.97 }}
                  className="px-8 py-4 rounded-full font-semibold text-lg text-white transition-all flex items-center justify-center gap-2 shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
                >
                  Start Creating Free
                  <FaArrowRight />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.03, backgroundColor: colors.bg }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-8 py-4 rounded-full font-semibold text-lg transition-all flex items-center justify-center gap-2 border-2"
                  style={{ borderColor: colors.primaryLight, color: colors.primary }}
                >
                  <FaPlay className="text-sm" />
                  See How It Works
                </motion.button>
              </motion.div>

              {/* Stats */}
              <motion.div variants={fadeInUp} className="flex justify-center lg:justify-start gap-6 lg:gap-10">
                {[
                  { value: '10K+', label: 'Creators' },
                  { value: '50K+', label: 'Podcasts' },
                  { value: '99%', label: 'Satisfaction' }
                ].map((stat, i) => (
                  <div key={i} className="text-center lg:text-left px-4 py-3 rounded-2xl bg-white/60 backdrop-blur-sm border border-purple-100/50 shadow-sm">
                    <div className="text-2xl lg:text-3xl font-bold" style={{ color: colors.primary }}>{stat.value}</div>
                    <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
                </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: Hero Image */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative"
            >
              {/* Glow effect behind image */}
              <div
                className="absolute inset-4 rounded-3xl blur-2xl opacity-30 -z-10"
                style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
              />

                <motion.div
                  whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.4 }}
                className="rounded-3xl overflow-hidden shadow-2xl border-2 border-purple-100/80 bg-white"
                >
                  <img
                    src={banner1}
                  alt="PodVerse Studio Preview"
                  className="w-full h-auto"
                  />
                </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 relative" style={{ backgroundColor: colors.bg }}>
        <div className="max-w-7xl mx-auto">
              <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-purple-700 text-sm font-medium mb-4 shadow-sm">
              <Zap className="w-4 h-4" />
              Powerful Features
              </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              <span className="text-gray-800">Everything You Need to </span>
              <span style={{ color: colors.primary }}>Create</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-gray-600 max-w-2xl mx-auto">
              Professional podcast tools powered by AI, designed to make creation simple and enjoyable.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -8, boxShadow: '0 30px 60px -15px rgba(124, 58, 237, 0.2)' }}
                className="bg-white rounded-3xl p-8 shadow-lg border border-purple-100/60 transition-all duration-300 group relative overflow-hidden"
              >
                {/* Subtle gradient overlay on hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${colors.primary}03 0%, ${colors.accent}05 100%)` }}
                />
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg relative z-10"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}20 100%)`,
                    color: colors.primary
                  }}
                >
                    {feature.icon}
                  </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 relative z-10">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed relative z-10">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 relative overflow-hidden bg-white">
        {/* Static Bubble Circles */}
        <div 
          className="absolute -left-32 top-20 w-96 h-96 rounded-full pointer-events-none"
          style={{ backgroundColor: colors.primaryLight, opacity: 0.12 }}
        />
        <div 
          className="absolute -right-20 bottom-10 w-80 h-80 rounded-full pointer-events-none"
          style={{ backgroundColor: colors.primary, opacity: 0.1 }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4" style={{ backgroundColor: `${colors.primary}10`, color: colors.primary }}>
              <FaRocket className="w-3 h-3" />
              Simple Process
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              <span className="text-gray-800">How It </span>
              <span style={{ color: colors.primary }}>Works</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-gray-600 max-w-2xl mx-auto">
              From idea to published podcast in three simple steps.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8 relative"
          >
            {/* Connecting line */}
            <div className="hidden md:block absolute top-24 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-purple-200 via-purple-300 to-purple-200" />

              {steps.map((step, index) => (
                <motion.div
                  key={index}
                variants={fadeInUp}
                whileHover={{ y: -10, boxShadow: '0 30px 60px -15px rgba(124, 58, 237, 0.2)' }}
                className="relative bg-white rounded-3xl p-8 shadow-xl border border-purple-100/60 text-center transition-all"
              >
                {/* Step number badge */}
                <div
                  className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full text-white text-lg font-bold flex items-center justify-center shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
                >
                      {index + 1}
                  </div>
                  
                <div
                  className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 mt-6"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}12 0%, ${colors.accent}18 100%)`,
                    color: colors.primary
                  }}
                >
                  {step.icon}
                  </div>

                <h3 className="text-xl font-bold text-gray-800 mb-3">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </motion.div>
              ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 relative overflow-hidden" style={{ backgroundColor: colors.bg }}>
        {/* Subtle bubble decorations */}
        <div 
          className="absolute top-20 right-10 w-64 h-64 rounded-full pointer-events-none"
          style={{ backgroundColor: colors.primary, opacity: 0.06 }}
        />
        <div 
          className="absolute bottom-20 left-10 w-80 h-80 rounded-full pointer-events-none"
          style={{ backgroundColor: colors.accent, opacity: 0.05 }}
        />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-purple-700 text-sm font-medium mb-4 shadow-sm">
              <Sparkles className="w-4 h-4" />
              Simple Pricing
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              <span className="text-gray-800">Choose Your </span>
              <span style={{ color: colors.primary }}>Plan</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-gray-600 max-w-2xl mx-auto">
              Start free and scale as you grow. No hidden fees.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8 items-start"
          >
            {/* Starter */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -8 }}
              className="bg-white rounded-3xl p-8 shadow-lg border border-purple-100/50 flex flex-col h-full"
            >
              <div className="mb-6">
                <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-gray-100 text-gray-600">
                  Starter
                </span>
              </div>
              <div className="text-5xl font-bold text-gray-900 mb-2">$19<span className="text-xl font-medium text-gray-400">/mo</span></div>
              <p className="text-gray-500 mb-8">Perfect for getting started.</p>
              <ul className="space-y-4 mb-8 flex-1">
                {["Multi-speaker recording", "Basic audio editing", "Video generation", "Social feed access"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-600">
                    <FaCheck style={{ color: colors.primary }} className="shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/signup-email')}
                className="w-full py-4 rounded-xl font-semibold transition-all border-2"
                style={{ borderColor: colors.primaryLight, color: colors.primary }}
              >
                Get Started
              </motion.button>
            </motion.div>

            {/* Pro - Highlighted */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -8 }}
              className="bg-white rounded-3xl p-8 shadow-2xl border-2 flex flex-col h-full relative md:-translate-y-4"
              style={{ borderColor: colors.primary }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl"
                style={{ background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
              />
              <div className="mb-6 flex items-center justify-between">
                <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide text-white" style={{ backgroundColor: colors.primary }}>
                  Pro
                </span>
                <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ backgroundColor: `${colors.primary}10`, color: colors.primary }}>
                  POPULAR
                </span>
              </div>
              <div className="text-5xl font-bold text-gray-900 mb-2">$49<span className="text-xl font-medium text-gray-400">/mo</span></div>
              <p className="text-gray-500 mb-8">For serious creators.</p>
              <ul className="space-y-4 mb-8 flex-1">
                {["Everything in Starter", "Multi-track audio + FX", "Video editor (Remotion)", "Unlimited transcripts", "Priority support"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700 font-medium">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: colors.primary }}>
                      <FaCheck />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -10px rgba(124, 58, 237, 0.4)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/signup-email')}
                className="w-full py-4 rounded-xl font-semibold text-white transition-all shadow-lg"
                style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
              >
                Get Pro Access
              </motion.button>
            </motion.div>

            {/* Enterprise */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -8 }}
              className="bg-white rounded-3xl p-8 shadow-lg border border-purple-100/50 flex flex-col h-full"
            >
              <div className="mb-6">
                <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-gray-100 text-gray-600">
                  Enterprise
                </span>
              </div>
              <div className="text-5xl font-bold text-gray-900 mb-2">Custom</div>
              <p className="text-gray-500 mb-8">For teams & organizations.</p>
              <ul className="space-y-4 mb-8 flex-1">
                {["Everything in Pro", "Admin controls", "Custom pipelines", "SLA support", "API access"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-600">
                    <FaCheck style={{ color: colors.primary }} className="shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/signup-email')}
                className="w-full py-4 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                Contact Sales
              </motion.button>
            </motion.div>
            </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              <span className="text-gray-800">Frequently Asked </span>
              <span style={{ color: colors.primary }}>Questions</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-gray-600">
              Everything you need to know about PodVerse.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="space-y-4"
          >
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="border border-purple-100 rounded-2xl overflow-hidden bg-white"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-purple-50/50 transition-colors"
                >
                  <span className={`text-lg font-medium transition-colors ${openFaqIndex === index ? 'text-purple-600' : 'text-gray-800'}`}>
                    {faq.question}
                  </span>
                  <motion.span
                    animate={{ rotate: openFaqIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ color: colors.primary }}
                  >
                    <FaChevronDown />
                  </motion.span>
                </button>
                <AnimatePresence>
                  {openFaqIndex === index && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)` }}
        />

        {/* Static Bubble Circles */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/8 rounded-full pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-purple-300/15 rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6"
            >
              Ready to Create Your First Podcast?
          </motion.h2>
          <motion.p 
              variants={fadeInUp}
              className="text-xl text-purple-100 mb-10 max-w-2xl mx-auto"
          >
            Join thousands of creators using PodVerse to record, edit, and publish professional podcasts with AI.
          </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button 
              onClick={() => navigate('/signup-email')}
                whileHover={{ scale: 1.03, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)' }}
                whileTap={{ scale: 0.97 }}
                className="bg-white px-10 py-4 rounded-full font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2"
                style={{ color: colors.primary }}
            >
              Get Started Free
              <FaArrowRight />
            </motion.button>
            <motion.button 
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.15)' }}
                whileTap={{ scale: 0.97 }}
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-10 py-4 rounded-full font-bold text-lg text-white border-2 border-white/30 hover:border-white/60 transition-all"
            >
              View Pricing
            </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                  style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
                >
                  <FaPodcast />
                </div>
                <span className="text-xl font-bold" style={{ color: colors.primary }}>PodVerse</span>
              </div>
              <p className="text-gray-500 mb-6 leading-relaxed">
                The all-in-one AI platform for modern podcasters.
              </p>
              <div className="flex gap-3">
                {[FaTwitter, FaFacebook, FaLinkedin].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-purple-600 hover:border-purple-200 transition-all"
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Studio', 'AI Editor'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-bold text-gray-900 mb-4">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-gray-500 hover:text-purple-600 transition-colors">
                        {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            ))}

            {/* Newsletter */}
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Stay Updated</h4>
              <p className="text-gray-500 text-sm mb-4">Get the latest tips and updates.</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Your email"
                  className="flex-1 px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm"
                />
                <button
                  className="px-4 py-3 rounded-xl text-white font-medium transition-all"
                  style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} PodVerse. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-purple-600 transition-colors">Terms</a>
              <a href="#" className="hover:text-purple-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-purple-600 transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="fixed bottom-8 right-8 w-12 h-12 text-white rounded-full shadow-lg transition-all flex items-center justify-center z-50"
            style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
          >
            <FaArrowUp />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LandingPage;
