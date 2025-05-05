const SamplePodcasts = () => {
    return (
      <div>
        <h2 className="text-2xl font-semibold mb-4">Sample Podcasts</h2>
        <div className="flex space-x-4 overflow-x-auto pb-2">
          {[1, 2, 3].map((_, i) => (
            <div
              key={i}
              className="min-w-[250px] bg-white shadow-md rounded-lg p-4"
            >
              <video
                src="https://youtu.be/L7iPWDIQU2s?si=ySvCyhgrKc91Vs_O"
                controls
                className="rounded-lg w-full"
              />
              <p className="mt-2 font-medium">Sample Podcast {i + 1}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  export default SamplePodcasts;
  