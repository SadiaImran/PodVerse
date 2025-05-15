import { Podcast, Eye, ThumbsUp, MessageCircle } from "lucide-react";

const SamplePodcast = () => {
  const samplePodcasts = [
    {
      id: 1,
      title: "Marketing in the AI Era",
      description: "Exploring modern marketing strategies using AI.",
      author: "Samantha Grey",
      timeAgo: "2h ago",
      views: "120",
      likes: "80",
      comments: "30",
      video: "https://www.w3schools.com/html/mov_bbb.mp4",
    },
    {
      id: 2,
      title: "Building a Brand Identity",
      description: "Learn how to create a compelling brand presence.",
      author: "James Rivera",
      timeAgo: "4h ago",
      views: "95",
      likes: "60",
      comments: "22",
      video: "https://www.w3schools.com/html/movie.mp4",
    },
  ];

  return (
    <div className="space-y-6">
      {samplePodcasts.map((podcast) => (
        <div
          key={podcast.id}
          className="flex bg-white rounded-xl shadow-md p-4 gap-4 items-start"
        >
          <div className="relative w-48 h-28 overflow-hidden rounded-lg">
            <video controls className="w-full h-full object-cover rounded-md">
              <source src={podcast.video} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="flex flex-col justify-between flex-1">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Podcast className="text-light-purple w-5 h-5" />
                <span className="font-semibold text-gray-800">
                  {podcast.title}
                </span>
              </div>
              <p className="text-sm text-gray-600">{podcast.description}</p>
            </div>
            <div className="flex gap-2 text-xs mt-3">
              <span className="bg-light-cream text-light-grey px-2 py-1 rounded-full flex items-center gap-1">
                <Eye size={14} /> {podcast.views} views
              </span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
                <ThumbsUp size={14} /> {podcast.likes} likes
              </span>
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center gap-1">
                <MessageCircle size={14} /> {podcast.comments} comments
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <img
                src="https://randomuser.me/api/portraits/women/65.jpg"
                alt={podcast.author}
                className="w-7 h-7 rounded-full"
              />
              <span className="text-xs text-gray-500">
                {podcast.author} · {podcast.timeAgo}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SamplePodcast;
