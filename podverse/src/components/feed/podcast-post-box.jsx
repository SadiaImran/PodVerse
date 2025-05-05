import { HiOutlineUpload, HiOutlinePlusCircle } from "react-icons/hi";

const PodcastPostBox = () => {
  return (
    <div className="bg-light-cream p-6 rounded-xl shadow-sm border border-gray-200 mb-4 max-w-3xl mx-auto">
    <div className="bg-white p-2 rounded-xl shadow-sm">
        <div className="p-2">
      <h2 className="text-lg  text-light-grey mb-6">
        Create post
      </h2>
      <div className="flex gap-4">
        <button className="flex items-center gap-2 px-4 py-2 bg-light-lavender text-white rounded-lg hover:bg-light-softBlue  transition">
          <HiOutlineUpload className="text-xl" />
          Upload from Library
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-light-lightGrey text-gray-700 rounded-lg hover:bg-gray-200 transition">
          <HiOutlinePlusCircle className="text-xl" />
          Create New Podcast
        </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default PodcastPostBox;
