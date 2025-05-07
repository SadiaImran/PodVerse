import { Podcast } from "lucide-react";

const SamplePodcast = () => {
  const AudioPlayer = ({ src }) => (
    <audio
      controls
      className="w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-light-purple bg-white"
    >
      <source src={src} type="audio/mp3" />
      Your browser does not support the audio element.
    </audio>
  );

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Sample Podcasts</h2>
      <ul className="space-y-6">
        {[1, 2].map((id) => (
          <li
            key={id}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Podcast className="text-light-purple w-5 h-5" />
                <span className="font-medium text-gray-900">
                  Sample Podcast {id}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {id === 1
                  ? "A quick look into the AI podcast experience."
                  : "Learn how PodVerse helps small businesses share stories."}
              </p>
              <AudioPlayer src={`/sample-audios/sample${id}.mp3`} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SamplePodcast;
