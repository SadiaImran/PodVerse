const KnowledgeBaseSetup = ({ formData, setFormData, goNext, goBack }) => {
    const handleUpload = (e) => {
      const files = Array.from(e.target.files);
      setFormData({ ...formData, documents: files });
    };
  
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-semibold text-gray-800">Knowledge Base Setup</h2>
  
        <div className="border p-4 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload Documents (PDF, DOCX, TXT)
          </label>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleUpload}
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
        </div>
  
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Enter Metadata
          </label>
          <textarea
            rows={3}
            value={formData.metadata}
            onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
            placeholder="E.g., About marketing trends, startup advice, etc."
            className="w-full border border-gray-300 rounded-lg p-3"
          />
        </div>
  
        <div className="flex justify-between">
          <button onClick={goBack} className="text-gray-600 hover:underline">
            Back
          </button>
          <button
            onClick={goNext}
            className="bg-light-purple text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            Next
          </button>
        </div>
      </div>
    );
  };
  
  export default KnowledgeBaseSetup;
  