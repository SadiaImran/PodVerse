import { HiOutlinePlus, HiOutlineMicrophone } from "react-icons/hi";

const CreatePodcastIntro = () => {
  return (
    <div className="text-left space-y-8 bg-white p-8 rounded-xl shadow-md">
      <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-snug flex items-center gap-3">
        <HiOutlineMicrophone className="text-light-purple text-5xl" />
        Let’s create something amazing!
      </h1>
      <p className="text-gray-600 max-w-2xl text-lg">
        Kickstart your journey by recording a new podcast episode and sharing your story with the world.
      </p>
      <button className="bg-gradient-to-r from-light-purple to-light-lightPurple text-white px-6 py-3 rounded-full text-lg font-semibold hover:scale-105 hover:shadow-lg transition-all duration-300 flex items-center">
        <HiOutlinePlus className="mr-2 text-xl" />
        Create New Podcast
      </button>
    </div>
  );
};

export default CreatePodcastIntro;
