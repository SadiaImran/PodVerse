import { CheckCircle, FileText, User, Mic, Info } from "lucide-react";
import { IoMdArrowRoundBack } from "react-icons/io";

const ReviewAndStart = ({ formData, goBack }) => {
  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Left Section - Review Summary */}
      <div className="space-y-6 flex-[2] bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800">Final Check: Ready to Launch?</h2>

        <div className="space-y-4">
          {/* Agent Name */}
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-light-purple" />
            <p className="text-gray-700">
              <span className="font-semibold">Name:</span> {formData.agentName || "Not provided"}
            </p>
          </div>

          {/* Role */}
          <div className="flex items-center gap-3">
            <Info className="w-6 h-6 text-light-purple" />
            <p className="text-gray-700">
              <span className="font-semibold">Role:</span> {formData.role || "Not selected"}
            </p>
          </div>

          {/* Tone */}
          <div className="flex items-center gap-3">
            <Mic className="w-6 h-6 text-light-purple" />
            <p className="text-gray-700">
              <span className="font-semibold">Tone:</span> {formData.tone || "Not selected"}
            </p>
          </div>

          {/* Documents */}
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-light-purple" />
            <p className="text-gray-700">
              <span className="font-semibold">Documents:</span> {formData.documents?.length || 0} uploaded
            </p>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-light-purple" />
            <p className="text-gray-700">
              <span className="font-semibold">Metadata:</span> {formData.metadata || "None"}
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          <button
            onClick={goBack}
            className="text-light-purple font-medium text-3xl hover:underline"
          >
            <IoMdArrowRoundBack />
          </button>
          <button
            className="bg-light-purple text-white px-8 py-2 rounded-xl shadow-md hover:bg-purple-700 transition-all"
          >
            Start Recording
          </button>
        </div>
      </div>

      {/* Right Section - Tips */}
      <div className="flex-[1] bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <div className="bg-indigo-50 p-4 border-b border-gray-100 rounded-t-xl">
          <h3 className="font-semibold text-xl text-gray-800">Tips</h3>
          <p className="text-sm text-gray-500">Ensure everything is set up correctly before starting.</p>
        </div>
        <div className="p-4 space-y-3">
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Double-check the agent's name and role.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Ensure the tone matches your brand's voice.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Verify all uploaded documents are correct.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Review metadata for completeness.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReviewAndStart;
