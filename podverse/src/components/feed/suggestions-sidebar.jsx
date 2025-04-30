const SuggestionsSidebar = () => {
    const creators = [
      { name: "Creative Minds", bio: "Design & storytelling" },
      { name: "Finance Pulse", bio: "Smart money tips" },
      { name: "The Space Show", bio: "Cosmic discoveries" },
    ];
  
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-2xl font-bold text-gray-800 mb-8">✨ Top Creators to Follow</h3>
        <div className="space-y-4">
          {creators.map((creator, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-700">{creator.name}</p>
                <p className="text-gray-500 text-sm">{creator.bio}</p>
              </div>
              <button className="text-base font-semibold text-light-purple bg-light-lightGrey rounded-md p-2 px-3 hover:bg-gray-200 transition">Follow</button>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  export default SuggestionsSidebar;
  