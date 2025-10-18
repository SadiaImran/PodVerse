import { Check } from "lucide-react";

const PodcastSetupStepper = ({ steps, currentStep }) => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 -z-10">
          <div 
            className="h-full bg-light-purple transition-all duration-300"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center relative z-10">
            {/* Step Circle */}
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
              ${index <= currentStep 
                ? 'bg-light-purple text-white' 
                : 'bg-gray-200 text-gray-500'
              }
            `}>
              {index < currentStep ? (
                <Check className="w-6 h-6" />
              ) : (
                index + 1
              )}
            </div>
            
            {/* Step Label */}
            <div className="mt-3 text-center">
              <p className={`text-sm font-medium ${
                index <= currentStep ? 'text-light-purple' : 'text-gray-500'
              }`}>
                {step}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PodcastSetupStepper;
