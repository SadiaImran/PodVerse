import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import img1 from "../../images/carousel-pic.png";
import img2 from "../../images/carousel-pic-1.png";
import img3 from "../../images/carousel-pic-2.png";
import img4 from "../../images/carousel-pic-3.png";

const images = [img1, img2, img3, img4];

export default function ImageCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const prevImage = () => {
    setIndex((i) => (i - 1 + images.length) % images.length);
  };

  const nextImage = () => {
    setIndex((i) => (i + 1) % images.length);
  };

  return (
    <div className="relative w-full h-full">
      {/* Image Layer */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence>
          <motion.img
            key={index}
            src={images[index]}
            alt={`Slide ${index}`}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          />
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
        {/* Left Arrow */}
        <button onClick={prevImage} className="p-1 hover:bg-white rounded-full transition">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        {/* Dots */}
        <div className="flex gap-2">
          {images.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${
                i === index ? "bg-gray-600" : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Right Arrow */}
        <button onClick={nextImage} className="p-1 hover:bg-white rounded-full transition">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
