import { HiOutlinePlus } from "react-icons/hi";

const CreatePodcastIntro = () => {
  return (
    <div className="text-left space-y-10">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
        🎧 Let’s create something amazing!
      </h1>
      <p className="text-gray-500 max-w-xl">
        Start your journey by creating a new podcast episode.
      </p>
      <button className="bg-light-purple text-white px-6 py-3 rounded-xl text-lg hover:bg-light-lavender transition flex items-center">
        <HiOutlinePlus className="inline-block mr-2 mt-0.5" />
        Create New Podcast
      </button>
    </div>
  );
};

export default CreatePodcastIntro;
