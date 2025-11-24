import { Sparkles, FileText, Users, Mic, ArrowRight, CheckCircle2 } from "lucide-react";

const CreateProjectModal = ({ isOpen, onClose, onProceed }) => {
  if (!isOpen) return null;

  const steps = [
    {
      icon: FileText,
      title: "Describe Your Podcast",
      description: "Tell us what your podcast is about"
    },
    {
      icon: Users,
      title: "Speaker Setup",
      description: "Choose your speakers and configure settings"
    },
    {
      icon: Mic,
      title: "Let's Interact",
      description: "Interact with your real-time speaker now"
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-8 md:p-10 transform transition-all"
        style={{ fontFamily: 'Inter, sans-serif' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ backgroundColor: '#f5f3ff' }}>
            <Sparkles size={32} style={{ color: '#6057C7' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#1C1C1C', fontFamily: 'Inter, sans-serif' }}>
            Create Your Podcast
          </h2>
          <p className="text-sm font-medium" style={{ color: '#6A6A6A', fontFamily: 'Inter, sans-serif' }}>
            Simple steps to get started
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6 mb-8 relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative flex items-start gap-4">
                <div className="flex-shrink-0 relative">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: '#f5f3ff' }}>
                    <Icon size={24} style={{ color: '#6057C7' }} />
                  </div>
                  {index < steps.length - 1 && (
                    <div className="absolute left-1/2 top-14 w-0.5 h-8 transform -translate-x-1/2" 
                      style={{ backgroundColor: '#e5e7eb' }} />
                  )}
                </div>
                <div className="flex-1 pt-1.5">
                  <h3 className="font-semibold text-base mb-1.5" style={{ color: '#1C1C1C', fontFamily: 'Inter, sans-serif' }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#6A6A6A', fontFamily: 'Inter, sans-serif' }}>
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
          
          {/* Final message */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t" style={{ borderColor: '#e5e7eb' }}>
            <CheckCircle2 size={22} style={{ color: '#10b981' }} />
            <div>
              <p className="text-sm font-semibold mb-0.5" style={{ color: '#1C1C1C', fontFamily: 'Inter, sans-serif' }}>
                And that's it! You got your podcast 🎉
              </p>
              <p className="text-xs font-medium" style={{ color: '#6057C7', fontFamily: 'Inter, sans-serif' }}>
                Enjoy podcasting!
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all border"
            style={{ 
              borderColor: '#e5e7eb', 
              color: '#6A6A6A'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#A388E7';
              e.target.style.backgroundColor = '#f5f3ff';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            style={{ 
              backgroundColor: '#6057C7', 
              color: '#F9F5EB',
              fontFamily: 'Inter, sans-serif'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4f46e5';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6057C7';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Sparkles size={18} style={{ color: '#F9F5EB' }} />
            <span>Proceed</span>
            <ArrowRight size={18} style={{ color: '#F9F5EB' }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;

