import { CheckCircle, FileText, User, Volume2, Mic, Info } from "lucide-react"; // Optional icons

const ReviewAndStart = ({ formData, goBack }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Final Check: Ready to Launch?</h2>

      <div className="bg-white shadow-lg rounded-2xl p-6 space-y-4 border border-gray-100">
        <div className="flex items-center gap-2 text-gray-700">
          <User className="w-5 h-5 text-light-purple" />
          <p><span className="font-semibold">Name:</span> {formData.agentName}</p>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Info className="w-5 h-5 text-light-purple" />
          <p><span className="font-semibold">Role:</span> {formData.role}</p>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Mic className="w-5 h-5 text-light-purple" />
          <p><span className="font-semibold">Tone:</span> {formData.tone}</p>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Volume2 className="w-5 h-5 text-light-purple" />
          <p><span className="font-semibold">Voice:</span> {formData.voice}</p>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <FileText className="w-5 h-5 text-light-purple" />
          <p><span className="font-semibold">Documents:</span> {formData.documents?.length || 0} uploaded</p>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <CheckCircle className="w-5 h-5 text-light-purple" />
          <p><span className="font-semibold">Metadata:</span> {formData.metadata || "None"}</p>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button 
          onClick={goBack} 
          className="text-gray-600 font-medium hover:underline"
        >
          ← Back
        </button>
        <button
          className="bg-light-purple text-white px-5 py-2 rounded-xl shadow-md hover:bg-purple-700 transition-all"
        >
         Start Recording
        </button>
      </div>
    </div>
  );
};

export default ReviewAndStart;
