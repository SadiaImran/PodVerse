import { User, Mic, BookOpen, Play } from "lucide-react";

const stepIcons = [User, Mic, BookOpen, Play];

const TimelineStepper = ({ steps, currentStep }) => {
  return (
    <div className="w-full max-w-4xl px-6 py-4">
      <ul className="flex justify-between items-start">
        {steps.map((step, index) => {
          const Icon = stepIcons[index];
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isLast = index === steps.length - 1;
          
          return (
            <li key={index} className="flex flex-col items-center relative flex-1">
              {/* Icon */}
              <div
                className={`w-16 h-16 flex items-center justify-center rounded-full border-2 z-10 bg-light-purple border-light-purpl
                  ${
                    isCompleted
                      ? "bg-light-purple border-light-purple text-white"
                      : isActive
                      ? "bg-white border-light-purple text-light-purple"
                      : "bg-white border-gray-300 text-gray-400"
                  }`}
              >
                <Icon className="w-8 h-8" />
              </div>
              
              {/* Label */}
              <p
                className={`mt-4 text-base font-semibold
                  ${
                    isCompleted || isActive
                      ? "text-light-purple"
                      : "text-gray-400"
                  }`}
              >
                {step}
              </p>
              
              {/* Connector line - not for last item */}
              {!isLast && (
                <div className="h-0.5 bg-gray-300 absolute top-8 left-1/2 w-full">
                  {(isCompleted) && (
                    <div className="h-full bg-light-purple w-full" />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};


export default TimelineStepper;