import React, { useState, useEffect , useRef  } from 'react';
import axios from 'axios';
import { Heart, MessageCircle, FileText, Share, Bookmark, MoreHorizontal, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { FiSend } from "react-icons/fi";
// Post Card Component
const PostCard = ({ post }) => {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoRef, setVideoRef] = useState(null);
  const commentRef = useRef(null);

  const handleVideoPlay = () => {
    if (videoRef) {
      if (isPlaying) {
        videoRef.pause();
      } else {
        videoRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMute = () => {
    if (videoRef) {
      videoRef.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffInHours = Math.floor((now - postTime) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <div className="bg-gray-100 font-headingPoppins rounded-3xl shadow-md border-2 border-gray-300 mb-6 hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
            {post.profiles && post.profiles.full_name
  ? post.profiles.full_name.charAt(0)
  : (post.title ? post.title.charAt(0) : "?")}
          </div>
          <div>
            <h3 className="font-semibold text-light-charcoal text-sm">
              {post.creator || post.title || "Unknown"}
            </h3>
            <p className="text-gray-500 text-xs">{formatTime(post.created_at)}</p>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <MoreHorizontal size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <h2 className="text-lg font-bold text-light-purple mb-1">{post.podcastTitle}</h2>
        <p className="text-light-grey text-sm leading-relaxed">{post.description}</p>
      </div>

      {/* Video Section */}
      <div className="relative">
        <video
          ref={setVideoRef}
          className="w-full aspect-video object-cover bg-gray-100"
          poster={post.thumbnail_url}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}s
          onLoadedMetadata={() => {
            if (videoRef) {
              setIsMuted(videoRef.muted);
            }
          }}
        >
          <source src={post.video_url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Video Controls Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center group">
          <button
            onClick={handleVideoPlay}
            className="w-16 h-16 bg-black bg-opacity-70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-80"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
          </button>
        </div>

        {/* Volume Control */}
        <button
          onClick={handleMute}
          className="absolute bottom-4 right-4 w-10 h-10 bg-black bg-opacity-70 rounded-full flex items-center justify-center text-white hover:bg-opacity-80 transition-all"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 py-2 text-sm text-gray-600">
        <span>{post.likes?.toLocaleString() || 0} likes</span>
        <span className="mx-2">•</span>
        <span>{post.comments?.length || 0} comments</span>
        <span className="mx-2">•</span>
        <span>{post.views?.toLocaleString() || 0} views</span>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 border-t border-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => setLiked(!liked)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                liked 
                  ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                  : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
              }`}
            >
              <Heart size={18} className={liked ? 'fill-current' : ''} />
              <span className="text-sm font-medium">Like</span>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-600 hover:text-blue-500 hover:bg-blue-50 transition-all duration-200"
            >
              <MessageCircle size={18} />
              <span className="text-sm font-medium">Comment</span>
            </button>

            <button className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-600 hover:text-green-500 hover:bg-green-50 transition-all duration-200">
              <Share size={18} />
              <span className="text-sm font-medium">Share</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setBookmarked(!bookmarked)}
              className={`p-2 rounded-lg transition-all duration-200 ${
                bookmarked 
                  ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100' 
                  : 'text-gray-600 hover:text-yellow-500 hover:bg-yellow-50'
              }`}
            >
              <Bookmark size={18} className={bookmarked ? 'fill-current' : ''} />
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md">
              <FileText size={16} />
              <span className="text-sm font-medium">Get Summary</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-50 p-4 bg-gray-50">
          <div className="space-y-3">
            {post.comments?.slice(0, 2).map((comment, index) => (
              <div key={index} className="flex space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                 {comment.profiles?.full_name?.charAt(0) || "?"}
                </div>
                <div className="flex-1">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="font-semibold text-sm text-gray-900">{comment.profiles?.full_name || "Anonymous"}</p>
                    <p className="text-gray-700 text-sm mt-1">{comment.content}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-3">{formatTime(comment.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Add Comment */}
          <div className="flex space-x-3 mt-4">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
              U
            </div>
            <div className="flex justify-between gap-3 items-center flex-1">
              <input
                type="text"
                placeholder="Write a comment..."
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                ref = {commentRef}
              />
              <FiSend className='w-10 h-10 text-white bg-light-purple rounded-full p-2'
              onClick={() =>{
                post.comments.push({
                  author: "User",
                  text: commentRef.current.value,
                  createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
       
                })
              }}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Activity Feed Component
const ActivityFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mock data - Replace with actual API calls
  const mockPosts = [
    {
      id: 1,
      creator: "TechTalks with Sara",
      podcastTitle: "The Future of AI in 2025",
      description: "A comprehensive visual exploration of how artificial intelligence is revolutionizing industries across the globe. From healthcare to finance, discover the transformative power of AI technology.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      thumbnail: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=450&fit=crop",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      likes: 1247,
      views: 12543,
      comments: [
        {
          author: "Alex Johnson",
          text: "This is incredibly insightful! The AI predictions for healthcare are fascinating.",
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        },
        {
          author: "Maria Garcia",
          text: "Thanks for breaking down complex AI concepts so clearly. Looking forward to more content!",
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        }
      ]
    },
    {
      id: 2,
      creator: "MindCast by Leo",
      podcastTitle: "Mental Fitness: Building Resilience",
      description: "Essential strategies and visual techniques to maintain mental sharpness and emotional resilience in our fast-paced world. Practical tips you can implement today.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=450&fit=crop",
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      likes: 892,
      views: 8234,
      comments: [
        {
          author: "Sarah Chen",
          text: "The meditation techniques you shared really work! Been practicing for a week now.",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        }
      ]
    },
    {
      id: 3,
      creator: "Design Decoded",
      podcastTitle: "UI/UX Trends That Will Dominate 2025",
      description: "From neumorphism to voice interfaces, explore the cutting-edge design trends shaping user experiences. Visual examples and practical implementation tips included.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=450&fit=crop",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      likes: 2156,
      views: 19847,
      comments: [
        {
          author: "David Park",
          text: "The glassmorphism examples are stunning! Can't wait to try these in my next project.",
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
        },
        {
          author: "Emma Wilson",
          text: "Finally someone explaining these trends with practical examples. Thank you!",
          createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
        }
      ]
    }
  ];

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        await axios.get("http://localhost:8000/posts")
          .then(res => {
            console.log("API response:", res.data);
            setPosts(res.data);
            setLoading(false);
          })
          .catch(err => {
            console.error("API error:", err);
            setPosts(mockPosts);
            setError("Failed to fetch from API, showing mock data.");
            setLoading(false);
          });
      } catch (err) {
        setPosts(mockPosts);
        setError("Failed to load posts");
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-4xl p-4  min-h-screen">
      <div className="mb-6 font-bodyRoboto">
        <h1 className="text-3xl font-bold text-light-purple mb-2">Activity Feed</h1>
        <p className="text-light-grey">Discover the latest podcast highlights and visual stories</p>
      </div>

      <div className="space-y-10">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* Load More Button */}
      <div className="text-center mt-8">
        <button className="px-6 py-3 bg-light-purple rounded-lg text-white hover:bg-gray-50 hover:text-light-purple hover:border-2 hover:border-light-purple transition-colors font-medium">
          Load More Posts
        </button>
      </div>
    </div>
  );
};

export default ActivityFeed;