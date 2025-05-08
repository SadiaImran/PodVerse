import { User, Mic, BookOpen, Play } from "lucide-react";

const stepIcons = [User, Mic, BookOpen, Play];

const TimelineStepper = ({ steps, currentStep }) => {
  return (
    <div className="relative w-full max-w-4xl mx-auto px-6">
      {/* Connector line */}
      <div className="absolute top-6 left-[80px] right-[80px] h-0.5 bg-gray-300 z-0">
        <div
          className="h-full bg-light-purple transition-all duration-300"
          style={{
            width: `${(currentStep / (steps.length - 1)) * 100}%`,
          }}
        />
      </div>

      <div className="grid grid-cols-4 gap-0 relative z-10">
        {steps.map((step, index) => {
          const Icon = stepIcons[index];
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;

          return (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`w-12 h-12 flex items-center justify-center rounded-full border-2 transition-all duration-300
                ${
                  isCompleted
                    ? "bg-light-purple border-light-purple text-white"
                    : isActive
                    ? "bg-white border-light-purple text-light-purple"
                    : "bg-gray-100 border-gray-300 text-gray-400"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <p
                className={`mt-2 text-sm font-medium text-center ${
                  isCompleted || isActive
                    ? "text-light-purple"
                    : "text-gray-400"
                }`}
              >
                {step}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineStepper;
