import { FiHeart, FiMessageCircle, FiFileText } from "react-icons/fi";

const ActivityFeed = () => {
  const posts = [
    {
      id: 1,
      creator: "TechTalks with Sara",
      podcastTitle: "The Future of AI",
      description: "A visual look into how AI is transforming industries.",
      videoUrl: "https://pixabay.com/videos/download/video-41758_source.mp4",
    },
    {
      id: 2,
      creator: "MindCast by Leo",
      podcastTitle: "Mental Fitness",
      description: "Visual tips to keep your mind sharp in 2025.",
      videoUrl: "https://pixabay.com/videos/download/video-41758_source.mp4",
    },
  ];

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <div key={post.id} className="bg-white p-4 rounded-xl shadow-sm border border-[#d4d2cc] w-full mb-6">
          <video
            controls
            className="w-full rounded-md object-cover"
          >
            <source src={post.videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          <h2 className="text-xl font-semibold text-light-purple mt-4">
            {post.podcastTitle}
          </h2>
          <p className="text-gray-600">by {post.creator}</p>
          <p className="text-gray-500 mt-2">{post.description}</p>

          <div className="flex items-center gap-4 sm:gap-6 mt-4 text-gray-600 text-sm">
            <button className="flex items-center gap-1 hover:text-light-lavender transition">
              <FiHeart className="text-lg" /> Like
            </button>
            <button className="flex items-center gap-1 hover:text-light-lavender transition">
              <FiMessageCircle className="text-lg" /> Comment
            </button>
            <button className="flex items-center gap-1 text-white bg-light-purple hover:bg-light-lavender px-3 py-1 rounded-md transition">
              <FiFileText className="text-lg" /> Summary
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityFeed;