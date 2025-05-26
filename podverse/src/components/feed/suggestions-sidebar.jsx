import ProfileJeena from '../../assets/images/icon-profile-jeena.png';
import ProfileOlive from '../../assets/images/icon-profile-olive.png';
import ProfileSally from '../../assets/images/icon-profile-sally.png';
import { HiOutlineUserCircle } from "react-icons/hi";

const SuggestionsSidebar = () => {
  const creators = [
    {
      name: "Creative Minds",
      bio: "Design & storytelling",
      image: ProfileSally, 
    },
    {
      name: "Finance Pulse",
      bio: "Smart money tips",
      image: ProfileOlive, 
    },
    {
      name: "The Space Show",
      bio: "Cosmic discoveries",
      image: ProfileJeena, 
    },
  ];

  const trendingTopics = [
    { tag: '#AI2025', posts: '2.3k posts' },
    { tag: '#PodcastTips', posts: '1.8k posts' },
    { tag: '#TechTrends', posts: '956 posts' },
    { tag: '#CreativeMinds', posts: '743 posts' },
  ];

  return (
    <div className="mt-4 space-y-6">
      {/* Suggestions */}
      <div className="bg-white rounded-3xl shadow-md border border-gray-300 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Add to your feed
        </h3>
        <div className="space-y-4">
          {creators.map((creator, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={creator.image}
                  alt={creator.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {creator.name}
                </p>
                <p className="text-gray-500 text-xs truncate">{creator.bio}</p>
              </div>
              <button className="bg-purple-50 text-purple-600 hover:bg-purple-100 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border border-purple-200">
                Follow
              </button>
            </div>
          ))}
        </div>
        <button className="text-purple-600 hover:text-purple-700 text-sm font-medium mt-4 hover:underline">
          View all recommendations →
        </button>
      </div>

      {/* Trending */}
      <div className="bg-white rounded-3xl shadow-md border border-gray-300 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Trending for you
        </h3>
        <div className="space-y-3">
          {trendingTopics.map((topic, idx) => (
            <div key={idx} className="hover:bg-gray-50 p-2 rounded-lg cursor-pointer transition-colors">
              <p className="font-semibold text-gray-900 text-sm">{topic.tag}</p>
              <p className="text-gray-500 text-xs">{topic.posts}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-light-purple rounded-2xl p-6 text-white">
        <h3 className="font-semibold mb-4">Your Impact</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-purple-100">Total Plays</span>
            <span className="font-semibold">12.4K</span>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-100">Followers</span>
            <span className="font-semibold">847</span>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-100">This Month</span>
            <span className="font-semibold">+23%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SuggestionsSidebar;