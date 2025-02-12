import { useState } from "react";
import { BsChevronCompactLeft, BsChevronCompactRight } from "react-icons/bs";
import { RxDotFilled } from "react-icons/rx";

function AuthCarousel() {
  const slides = [
    {
      url: "./src/assets/images/Chat-bot-amico.png",
    },
    {
      url: "./src/assets/images/Chat-bot-bro.png",
    },
    {
      url: "./src/assets/images/img-media-person.jpg",
    },
    {
      url: "./src/assets/images/Podcast-audience-bro.png",
    },
    {
      url: "./src/assets/images/Podcast-audience-pana.png",
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? slides.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const nextSlide = () => {
    const isLastSlide = currentIndex === slides.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  const goToSlide = (slideIndex) => {
    setCurrentIndex(slideIndex);
  };

  return (
    <div className="max-w-[1400px] h-[780px] w-full m-auto py-16 px-4 relative flex justify-center items-center">
      <div
        style={{ backgroundImage: `url(${slides[currentIndex].url})` }}
        className="w-full max-w-[700px] h-[600px] rounded-2xl bg-center bg-cover duration-500"
      ></div>

      <div
        className="absolute top-1/2 left-5 transform -translate-y-1/2 text-3xl rounded-full p-2 bg-black/30 text-white cursor-pointer"
        onClick={prevSlide}
      >
        <BsChevronCompactLeft size={30} />
      </div>

      <div
        className="absolute top-1/2 right-5 transform -translate-y-1/2 text-3xl rounded-full p-2 bg-black/30 text-white cursor-pointer"
        onClick={nextSlide}
      >
        <BsChevronCompactRight size={30} />
      </div>


      <div className="absolute bottom-5 flex space-x-2">
        {slides.map((_, slideIndex) => (
          <div
            key={slideIndex}
            onClick={() => goToSlide(slideIndex)}
            className={`text-2xl cursor-pointer ${
              slideIndex === currentIndex ? "text-primary-500" : "text-gray-400"
            }`}
          >
            <RxDotFilled />
          </div>
        ))}
      </div>
    </div>
  );
}

export default AuthCarousel;
