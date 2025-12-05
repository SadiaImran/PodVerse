import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPodcast, 
  FaMicrophone, 
  FaFileAlt, 
  FaRocket,
  FaCheckCircle,
  FaUpload,
  FaHeadphones,
  FaWaveSquare,
  FaLaptop,
  FaQuoteLeft,
  FaChevronLeft,
  FaChevronRight,
  FaPlay,
  FaShare,
  FaTwitter,
  FaFacebook,
  FaLinkedin,
  FaStar,
  FaArrowRight,
  FaBars,
  FaTimes,
  FaInfoCircle,
  FaCreditCard,
  FaQuestionCircle,
  FaCheck,
  FaChevronDown,
  FaArrowUp
} from 'react-icons/fa';
import { MdAutoAwesome, MdGraphicEq, MdDashboard, MdVideoLibrary, MdTrendingUp } from 'react-icons/md';
import { 
  Mic, 
  FileText, 
  Sparkles, 
  Video, 
  Zap,
  Users,
  TrendingUp,
  Clock,
  Share2,
  PlayCircle,
  Brain,
  Wand2,
  Radio
} from 'lucide-react';

// Import actual images and video
import podcastAudienceBro from '../images/Podcast-audience-bro.png';
import podcastAudiencePana from '../images/Podcast-audience-pana.png';
import speechToTextBro from '../images/Speech-to-text-bro.png';
import speechToTextPana from '../images/Speech-to-text-pana.png';
import chatBotAmico from '../images/Chat-bot-amico.png';
import banner1 from '../images/banner-1.png';
import banner2 from '../images/banner-2.png';
import page1 from '../images/page-1.jpg';
import aiTechVideo from '../images/AI Tech Insights.mp4';
import carouselPic1 from '../images/carousel-pic-1.png';
import carouselPic2 from '../images/carousel-pic-2.png';
import carouselPic3 from '../images/carousel-pic-3.png';
import carouselPic from '../images/carousel-pic.png';

function LandingPage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const carouselRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const videoRef = useRef(null);
  const autoScrollIntervalRef = useRef(null);

  // Real podcast episodes with actual images
  const podcastEpisodes = [
    {
      id: 1,
      title: "The Future of AI in Content Creation",
      description: "Join us as we explore how artificial intelligence is revolutionizing the way we create and consume content. Featuring industry experts and real-world examples.",
      host: "Sarah Chen",
      hostImage: "👩‍💼",
      duration: "45 min",
      category: "Technology",
      image: banner1,
      gradient: "from-purple-500 via-indigo-600 to-purple-700"
    },
    {
      id: 2,
      title: "Building Your Personal Brand Through Podcasting",
      description: "Learn how to leverage podcasting to build a strong personal brand and connect with your audience on a deeper level. Tips from successful creators.",
      host: "Michael Rodriguez",
      hostImage: "👨‍💻",
      duration: "38 min",
      category: "Business",
      image: banner2,
      gradient: "from-pink-500 via-rose-600 to-pink-700"
    },
    {
      id: 3,
      title: "The Art of Storytelling in Digital Media",
      description: "Discover the secrets of compelling storytelling and how to craft narratives that captivate your audience and drive engagement.",
      host: "Emily Watson",
      hostImage: "👩‍🎤",
      duration: "52 min",
      category: "Creative",
      image: page1,
      gradient: "from-blue-500 via-cyan-600 to-blue-700"
    },
    {
      id: 4,
      title: "Entrepreneurship in the Digital Age",
      description: "A deep dive into starting and scaling a business in today's digital landscape. Real stories from entrepreneurs who made it big.",
      host: "David Kim",
      hostImage: "👨‍💼",
      duration: "41 min",
      category: "Business",
      image: carouselPic,
      gradient: "from-purple-500 via-pink-600 to-purple-700"
    }
  ];

  const features = [
    {
      icon: <Mic className="w-12 h-12" />,
      title: "AI Recording Studio",
      description: "LiveKit-based recording with multi-speaker capture, real-time monitoring, and instant Supabase storage.",
      gradientClass: "from-purple-100 to-purple-200",
      textClass: "text-purple-600",
      image: banner1,
      stats: "Live + Sync"
    },
    {
      icon: <Radio className="w-12 h-12" />,
      title: "Audio Editing Suite",
      description: "Trim, fades, EQ, and multi-track mixing with waveform edits and fast exports.",
      gradientClass: "from-indigo-100 to-indigo-200",
      textClass: "text-indigo-600",
      image: banner2,
      stats: "Multi-track + FX"
    },
    {
      icon: <Video className="w-12 h-12" />,
      title: "Video Generation",
      description: "Generate avatar videos with B-roll and branding; transcripts saved to Supabase.",
      gradientClass: "from-purple-100 to-indigo-100",
      textClass: "text-purple-600",
      image: page1,
      stats: "Avatars + Captions"
    },
    {
      icon: <MdVideoLibrary className="w-12 h-12" />,
      title: "Video Editor",
      description: "Timeline editing with overlays, Supabase visuals, stock media, and Remotion rendering.",
      gradientClass: "from-blue-100 to-blue-200",
      textClass: "text-blue-600",
      image: carouselPic,
      stats: "Timeline + Render"
    },
    {
      icon: <Users className="w-12 h-12" />,
      title: "Social Feed & Posts",
      description: "Post podcasts, videos, and clips with likes, comments, summaries, and play/pause UX fixes.",
      gradientClass: "from-pink-100 to-pink-200",
      textClass: "text-pink-600",
      image: chatBotAmico,
      stats: "Posts + Summaries"
    },
    {
      icon: <Wand2 className="w-12 h-12" />,
      title: "Voice Cloning & AI Voices",
      description: "Clone voices, pick AI tones, and swap speaker voices for generation or editing.",
      gradientClass: "from-emerald-100 to-emerald-200",
      textClass: "text-emerald-600",
      image: podcastAudienceBro,
      stats: "Custom Tones"
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Set Up & Record",
      description: "Pick avatars/voices, connect Supabase, and record with LiveKit multi-speaker capture.",
      icon: <Wand2 className="text-3xl" />,
      image: banner1
    },
    {
      number: "02",
      title: "Edit & Generate",
      description: "Waveform edits, EQ, then generate avatar videos with branding and transcripts saved.",
      icon: <MdVideoLibrary className="text-3xl" />,
      image: banner2
    },
    {
      number: "03",
      title: "Publish & Share",
      description: "Post to feed with summaries, likes, comments, and smooth play/pause UX.",
      icon: <FaRocket className="text-3xl" />,
      image: carouselPic
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Podcast Creator",
      content: "PODverse has completely transformed how I create podcasts. The AI features are absolutely incredible and save me hours every week!",
      avatar: "👩‍💼",
      rating: 5,
      image: carouselPic1
    },
    {
      name: "Michael Chen",
      role: "Content Creator",
      content: "The auto-transcription and AI script generation are game-changers. I can focus on content while PODverse handles the technical stuff.",
      avatar: "👨‍💻",
      rating: 5,
      image: carouselPic2
    },
    {
      name: "Emily Rodriguez",
      role: "Podcast Host",
      content: "Best podcast platform I've ever used. The one-click publishing and AI avatar videos make me look like a professional studio!",
      avatar: "👩‍🎤",
      rating: 5,
      image: carouselPic3
    }
  ];

  const faqs = [
    {
      question: "How does AI transcription work?",
      answer: "Our AI uses advanced speech recognition to automatically transcribe your podcast episodes with high accuracy, supporting multiple languages and speakers. It can distinguish between different speakers and provide timestamps for each segment."
    },
    {
      question: "Can I edit my podcast after recording?",
      answer: "Yes! PODverse includes a full-featured audio and video editor where you can trim, enhance, add effects, and even generate AI avatar videos from your audio recordings."
    },
    {
      question: "Which platforms can I publish to?",
      answer: "You can publish to all major podcast platforms including Spotify, Apple Podcasts, Google Podcasts, and more with just one click. We handle all the technical details for you."
    },
    {
      question: "Is there a free plan?",
      answer: "Yes, we offer a free plan with basic features. Upgrade to premium for advanced AI features, unlimited storage, and priority support."
    },
    {
      question: "How do AI avatars work?",
      answer: "Our AI avatar system uses advanced video generation technology to create professional-looking videos from your audio. You can choose from multiple avatar styles, voices, and backgrounds to match your brand."
    }
  ];

  // Auto-scroll carousel
  useEffect(() => {
    if (!isPaused) {
      autoScrollIntervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % podcastEpisodes.length);
      }, 6000); // Change slide every 6 seconds
    } else {
      clearInterval(autoScrollIntervalRef.current);
    }

    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, [isPaused, podcastEpisodes.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % podcastEpisodes.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + podcastEpisodes.length) % podcastEpisodes.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const handleVideoPlay = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const handleShare = (episode, platform) => {
    const url = window.location.href;
    const text = `Check out this podcast: ${episode.title}`;
    
    let shareUrl = '';
    switch(platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navigation Bar */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-purple-100 shadow-md"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <motion.div 
              className="cursor-pointer flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/')}
            >
              <span 
                className="text-3xl md:text-4xl font-bold text-purple-600"
                style={{
                  fontFamily: "'Rubik', 'Inter', 'Poppins', sans-serif",
                  fontWeight: 700,
                  letterSpacing: '1px',
                  display: 'inline-block',
                  lineHeight: '1.1'
                }}
              >
                PodVerse
              </span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              <a 
                href="#about" 
                className="px-4 py-2 text-gray-700 hover:text-purple-600 font-semibold transition-colors rounded-lg hover:bg-purple-50 flex items-center gap-2"
                style={{ fontFamily: 'inherit' }}
              >
                <FaInfoCircle className="text-sm" />
                About
              </a>
              <a 
                href="#features" 
                className="px-4 py-2 text-gray-700 hover:text-purple-600 font-semibold transition-colors rounded-lg hover:bg-purple-50 flex items-center gap-2"
                style={{ fontFamily: 'inherit' }}
              >
                <FaMicrophone className="text-sm" />
                Features
              </a>
              <a 
                href="#how-it-works" 
                className="px-4 py-2 text-gray-700 hover:text-purple-600 font-semibold transition-colors rounded-lg hover:bg-purple-50 flex items-center gap-2"
                style={{ fontFamily: 'inherit' }}
              >
                <FaRocket className="text-sm" />
                How It Works
              </a>
              <a 
                href="#pricing" 
                className="px-4 py-2 text-gray-700 hover:text-purple-600 font-semibold transition-colors rounded-lg hover:bg-purple-50 flex items-center gap-2"
                style={{ fontFamily: 'inherit' }}
              >
                <FaCreditCard className="text-sm" />
                Pricing
              </a>
            </div>

            {/* Action Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <motion.button 
                onClick={() => navigate('/signin-email')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2.5 text-purple-600 font-semibold rounded-full border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-300"
              >
                Sign In
              </motion.button>
              <motion.button 
                onClick={() => navigate('/signup-email')}
                whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3)' }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-full hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-purple-500/30 flex items-center gap-2"
              >
                Get Started
                <FaArrowRight className="text-sm" />
              </motion.button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-colors"
            >
              {isMobileMenuOpen ? (
                <FaTimes className="text-2xl" />
              ) : (
                <FaBars className="text-2xl" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden border-t border-purple-100 py-4 space-y-2"
              >
                <a 
                  href="#about" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  style={{ fontFamily: 'inherit' }}
                >
                  <FaInfoCircle className="text-sm" />
                  About
                </a>
                <a 
                  href="#features" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  style={{ fontFamily: 'inherit' }}
                >
                  <FaMicrophone className="text-sm" />
                  Features
                </a>
                <a 
                  href="#how-it-works" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  style={{ fontFamily: 'inherit' }}
                >
                  <FaRocket className="text-sm" />
                  How It Works
                </a>
                <a 
                  href="#pricing" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  style={{ fontFamily: 'inherit' }}
                >
                  <FaCreditCard className="text-sm" />
                  Pricing
                </a>
                <div className="pt-4 border-t border-purple-100 space-y-2 px-4">
                  <motion.button 
                    onClick={() => {
                      navigate('/signin-email');
                      setIsMobileMenuOpen(false);
                    }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full px-6 py-3 text-purple-600 font-semibold rounded-full border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-300"
                  >
                    Sign In
                  </motion.button>
                  <motion.button 
                    onClick={() => {
                      navigate('/signup-email');
                      setIsMobileMenuOpen(false);
                    }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-full hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
                  >
                    Get Started
                    <FaArrowRight className="text-sm" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>

      {/* Hero Section with Video Background */}
      <section className="pt-24 pb-8 px-6 relative overflow-hidden min-h-[85vh] flex items-center">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            className="w-full h-full object-cover opacity-20"
            loop
            muted
            autoPlay
            playsInline
          >
            <source src={aiTechVideo} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/95 to-white"></div>
        </div>

        {/* Background Blob Circles - More Visible */}
        <div className="absolute top-20 right-20 w-72 h-72 rounded-full" style={{ backgroundColor: '#A388E7', opacity: 0.15 }}></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full" style={{ backgroundColor: '#6057C7', opacity: 0.15 }}></div>
        
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="space-y-5">
                <div className="space-y-3">
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                    <span style={{ color: '#6A6A6A' }}>Create Amazing</span>
                    <br />
                    <span style={{ color: '#6057C7' }}>Podcasts with AI</span>
                  </h1>
                  <p className="text-lg md:text-xl leading-relaxed max-w-2xl" style={{ color: '#6A6A6A' }}>
                    Transform your ideas into professional podcasts with our AI-powered platform. 
                    Record, transcribe, edit, and publish—all in one place.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <motion.button 
                  onClick={() => navigate('/signup-email')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 rounded-full font-semibold text-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#2F2867'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#6057C7'}
                >
                  Start Creating Free
                  <FaArrowRight />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
                  style={{ border: '2px solid #A388E7', color: '#6057C7', backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#A388E7';
                    e.target.style.color = '#F9F5EB';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#6057C7';
                  }}
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <FaPlay />
                  Watch Demo
                </motion.button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-6">
                <div>
                  <div className="text-3xl font-bold" style={{ color: '#6057C7' }}>10K+</div>
                  <div className="text-sm" style={{ color: '#6A6A6A' }}>Active Users</div>
                </div>
                <div>
                  <div className="text-3xl font-bold" style={{ color: '#A388E7' }}>50K+</div>
                  <div className="text-sm" style={{ color: '#6A6A6A' }}>Podcasts Created</div>
                </div>
                <div>
                  <div className="text-3xl font-bold" style={{ color: '#6057C7' }}>99%</div>
                  <div className="text-sm" style={{ color: '#6A6A6A' }}>Satisfaction</div>
                </div>
              </div>
            </motion.div>

            {/* Right: Image/Illustration */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative">
                <motion.div
                  className="w-full h-auto rounded-xl shadow-2xl overflow-hidden border border-purple-100 bg-white"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent pointer-events-none" />
                  <img
                    src={banner1}
                    alt="Podcast studio preview"
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Podcast Episodes Carousel */}
      <section 
        className="py-20 px-6 bg-gradient-to-b from-white to-purple-50/30"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">
              <span style={{ color: '#6A6A6A' }}>Featured</span>{' '}
              <span style={{ color: '#6057C7' }}>Podcasts</span>
            </h2>
            <p className="text-2xl md:text-3xl text-gray-600">
              Explore our latest AI-generated podcast episodes
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {podcastEpisodes.map((episode) => (
              <motion.div
                key={episode.id}
                whileHover={{ y: -10, scale: 1.01 }}
                className="bg-white rounded-3xl overflow-hidden shadow-xl border border-purple-100 flex flex-col"
              >
                <div className="relative h-64">
                  <img
                    src={episode.image}
                    alt={episode.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}>
                    {episode.category}
                  </div>
                  <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-700 flex items-center gap-1 shadow">
                    <Clock className="w-4 h-4" />
                    {episode.duration}
                  </div>
                  <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-700 flex items-center gap-1 shadow">
                    <FaMicrophone className="text-purple-600" />
                    {episode.host}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col gap-3">
                  <h3 className="text-xl font-bold text-gray-900 leading-snug line-clamp-2">
                    {episode.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {episode.description}
                  </p>

                  <div className="flex items-center gap-2 mt-auto">
                    <motion.button 
                      onClick={() => navigate('/signup-email')}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="px-4 py-2 rounded-full text-sm font-semibold"
                      style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                    >
                      Listen Now
                    </motion.button>
                    <div className="flex items-center gap-1 ml-auto">
                      <motion.button
                        onClick={() => handleShare(episode, 'twitter')}
                        whileHover={{ scale: 1.05 }}
                        className="w-10 h-10 rounded-full flex items-center justify-center border border-purple-100 text-purple-600 bg-white shadow-sm"
                        title="Share"
                      >
                        <FaShare />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section with Images */}
      <section id="features" className="py-20 px-6 bg-gradient-to-b from-purple-50/30 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold"
            >
              <span style={{ color: '#6A6A6A' }}>Everything You Need to</span>{' '}
              <span style={{ color: '#6057C7' }}>Create</span>
            </motion.h2>
            <p className="text-2xl md:text-3xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to make podcast creation simple and enjoyable
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100 hover:shadow-xl hover:border-purple-300 transition-all duration-300 flex items-start gap-5"
              >
                <div className={`shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradientClass} flex items-center justify-center ${feature.textClass} shadow-sm`}>
                  <div className="scale-75 transform">
                    {feature.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">{feature.description}</p>
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full w-fit">
                    <MdTrendingUp className="text-sm" />
                    <span>{feature.stats}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section with Images */}
      <section id="how-it-works" className="py-20 px-6 bg-white relative overflow-hidden">
        <div className="absolute -left-32 -top-10 w-96 h-96 rounded-full pointer-events-none" style={{ backgroundColor: '#A388E7', opacity: 0.18, filter: 'blur(2px)' }} />
        <div className="absolute -right-32 bottom-0 w-96 h-96 rounded-full pointer-events-none" style={{ backgroundColor: '#6057C7', opacity: 0.16, filter: 'blur(2px)' }} />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">
              <span style={{ color: '#6A6A6A' }}>How It</span>{' '}
              <span style={{ color: '#6057C7' }}>Works</span>
            </h2>
            <p className="text-2xl md:text-3xl text-gray-600 max-w-2xl mx-auto">
              End-to-end flow from setup to publish
            </p>
          </div>

          <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-dashed border-t-2 border-purple-100 border-dashed z-0" style={{ top: '6rem' }} />

            <div className="grid md:grid-cols-3 gap-8 relative z-10">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 flex flex-col items-center text-center gap-5 border border-purple-50"
                >
                  <div className="relative">
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg bg-white relative z-10"
                      style={{ border: '3px solid #6057C7' }}
                    >
                      <div className="text-purple-600 transform group-hover:scale-110 transition-transform duration-300">
                        {step.icon}
                      </div>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm z-20">
                      {index + 1}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-white to-purple-50/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">
              <span style={{ color: '#6A6A6A' }}>Pricing</span>{' '}
              <span style={{ color: '#6057C7' }}>Plans</span>
            </h2>
            <p className="text-2xl md:text-3xl text-gray-600 max-w-3xl mx-auto">
              Choose the plan that fits your podcast workflow—from recording to publish.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {/* Starter */}
            <motion.div
              whileHover={{ y: -10 }}
              className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 flex flex-col h-full"
            >
              <div className="mb-6">
                <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-gray-100 text-gray-600">
                  Starter
                </span>
              </div>
              <div className="text-5xl font-bold text-gray-900 mb-4">$19<span className="text-xl font-medium text-gray-500">/mo</span></div>
              <p className="text-gray-600 mb-8 leading-relaxed">Perfect for solo creators getting started with AI tools.</p>
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  "LiveKit recording (multi-speaker)",
                  "Audio editing (trim, fades, EQ)",
                  "Video generation (basic)",
                  "Social feed & summaries"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <div className="mt-0.5 text-purple-500 shrink-0">
                      <FaCheck />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors border border-purple-100"
                onClick={() => navigate('/signup-email')}
              >
                Get Starter
              </motion.button>
            </motion.div>

            {/* Pro - Highlighted */}
            <motion.div
              whileHover={{ y: -10 }}
              className="bg-white rounded-3xl p-8 shadow-2xl border-2 border-purple-500 flex flex-col h-full relative overflow-hidden transform md:-translate-y-4"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-600 to-indigo-600"></div>
              <div className="mb-6 flex items-center justify-between">
                <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-purple-100 text-purple-700">
                  Pro Plan
                </span>
                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
                  MOST POPULAR
                </span>
              </div>
              <div className="text-5xl font-bold text-gray-900 mb-4">$49<span className="text-xl font-medium text-gray-500">/mo</span></div>
              <p className="text-gray-600 mb-8 leading-relaxed">Full power for serious creators. Edit audio, video, and publish.</p>
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  "Everything in Starter",
                  "Multi-track audio + FX suite",
                  "Video editor (Remotion render)",
                  "Supabase visuals manager",
                  "Unlimited transcripts"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-medium text-gray-800">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs shrink-0">
                      <FaCheck />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
                onClick={() => navigate('/signup-email')}
              >
                Get Pro Access
              </motion.button>
            </motion.div>

            {/* Enterprise */}
            <motion.div
              whileHover={{ y: -10 }}
              className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 flex flex-col h-full"
            >
              <div className="mb-6">
                <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-gray-100 text-gray-600">
                  Enterprise
                </span>
              </div>
              <div className="text-5xl font-bold text-gray-900 mb-4">Custom</div>
              <p className="text-gray-600 mb-8 leading-relaxed">Tailored workflows and dedicated support for teams.</p>
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  "Everything in Pro",
                  "Admin controls & roles",
                  "Custom render pipelines",
                  "Priority support (SLA)",
                  "API access"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <div className="mt-0.5 text-purple-500 shrink-0">
                      <FaCheck />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl font-bold text-gray-700 bg-white border-2 border-gray-200 hover:border-purple-200 hover:text-purple-600 transition-colors"
                onClick={() => navigate('/signup-email')}
              >
                Contact Sales
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">
              <span style={{ color: '#6A6A6A' }}>Frequently Asked</span>{' '}
              <span style={{ color: '#6057C7' }}>Questions</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-lg mx-auto">
              Everything you need to know about getting started with PODverse
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-gray-200 last:border-none"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full py-4 flex items-center justify-between text-left group hover:text-purple-600 transition-colors focus:outline-none"
                >
                  <span className={`text-lg font-medium transition-colors ${openFaqIndex === index ? 'text-purple-600' : 'text-gray-700 group-hover:text-purple-600'}`}>
                    {faq.question}
                  </span>
                  <span 
                    className={`text-purple-500 transition-transform duration-300 ${openFaqIndex === index ? 'rotate-180 text-red-500' : ''}`}
                  >
                    <FaChevronDown />
                  </span>
                </button>
                <AnimatePresence>
                  {openFaqIndex === index && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                      exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-[#6057C7]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-600/50 to-indigo-900/50"></div>
        
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-400/20 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight"
          >
            Ready to Start Your Journey?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-purple-100 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Join thousands of creators using PodVerse to record, edit, and publish professional podcasts with AI.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.button 
              onClick={() => navigate('/signup-email')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-purple-700 px-10 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all flex items-center gap-2"
            >
              Get Started Free
              <FaArrowRight />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-4 rounded-full font-bold text-lg text-white border-2 border-white/30 hover:border-white transition-all"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            >
              View Pricing
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 pt-20 pb-10 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
                   <FaPodcast className="text-xl" />
                </div>
                <span className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'Rubik, sans-serif' }}>PodVerse</span>
              </div>
              <p className="text-gray-500 leading-relaxed">
                The all-in-one AI platform for next-gen podcasters. Record, edit, and grow your show with ease.
              </p>
              <div className="flex gap-4">
                {[FaTwitter, FaFacebook, FaLinkedin].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-purple-600 hover:border-purple-200 hover:shadow-md transition-all">
                    <Icon />
                  </a>
                ))}
              </div>
            </div>

            {/* Links Column 1 */}
            <div>
              <h4 className="font-bold text-gray-900 mb-6">Product</h4>
              <ul className="space-y-4">
                {['Features', 'Pricing', 'LiveKit Studio', 'AI Editor', 'Showcase'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-500 hover:text-purple-600 transition-colors block hover:translate-x-1 transform duration-200">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Links Column 2 */}
            <div>
              <h4 className="font-bold text-gray-900 mb-6">Company</h4>
              <ul className="space-y-4">
                {['About Us', 'Careers', 'Blog', 'Contact', 'Privacy Policy'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-500 hover:text-purple-600 transition-colors block hover:translate-x-1 transform duration-200">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter Column */}
            <div>
              <h4 className="font-bold text-gray-900 mb-6">Stay Updated</h4>
              <p className="text-gray-500 mb-4 text-sm">Get the latest AI podcasting tips and feature updates.</p>
              <div className="space-y-3">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
                <button className="w-full px-4 py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200">
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

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 w-12 h-12 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all flex items-center justify-center z-50 hover:-translate-y-1"
          >
            <FaArrowUp />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LandingPage;
