import ProfileJeena from '../../assets/images/icon-profile-jeena.png';
import ProfileOlive from '../../assets/images/icon-profile-olive.png';
import ProfileSally from '../../assets/images/icon-profile-sally.png';
// SuggestionsSidebar.jsx - More responsive design
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

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border-[2.5px] border-gray-300 ">
      <h3 className="text-lg font-subheadingDMSans font-semibold text-light-black mb-4">Add to your feed</h3>

      <div className="flex flex-col space-y-6">
        {creators.map((creator, idx) => (
          <div key={idx} className="flex items-center gap-3 ">
            {/* Profile Image - smaller on mobile */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
              {creator.image ? (
                <img
                  src={creator.image}
                  alt={creator.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <HiOutlineUserCircle className="w-full h-full text-gray-400" />
              )}
            </div>

            {/* Name & Bio */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 leading-tight ">
                {creator.name}
              </p>
              <p className="text-xs text-gray-500 ">{creator.bio}</p>
            </div>

            {/* Follow Button -  */}
            <button className="text-xs sm:text-sm font-medium font-headingPoppins border rounded-full px-3 sm:px-4 py-2 hover:bg-light-purple hover:text-light-lightGrey transition whitespace-nowrap">
              + Follow
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 ml-4">
        <button className="text-sm text-light-purple hover:underline font-medium">
          View all recommendations →
        </button>
      </div>
    </div>
  );
};

export default SuggestionsSidebar;