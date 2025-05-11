import { useState, useRef } from "react";
import { FaUpload, FaTimes } from "react-icons/fa";

import { IoMdArrowRoundBack } from "react-icons/io";

const KnowledgeBaseSetup = ({ formData, setFormData , goNext , goBack }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const MAX_FILES = 10;

  const handleClick = () => {
    if (fileInputRef.current && uploadedFiles.length < MAX_FILES) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  const handleFileChange = (fileList) => {
    if (!fileList || fileList.length === 0) return;

    // Filter for allowed file types and size
    const allowedFiles = Array.from(fileList).filter(
      (file) =>
        file.size <= 10 * 1024 * 1024 // Max size: 10MB
    );

    // Respect the maximum file limit
    const filesToAdd = allowedFiles.slice(0, MAX_FILES - uploadedFiles.length);

    if (filesToAdd.length > 0) {
      const newFiles = filesToAdd.map((file) => ({
        file,
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        url: URL.createObjectURL(file),
      }));

      setUploadedFiles((prev) => [...prev, ...newFiles]);

      // Update formData if provided
      if (setFormData) {
        setFormData((prev) => ({
          ...prev,
          documents: [...(prev.documents || []), ...filesToAdd],
        }));
      }
    }
  };

  const removeFile = (id, e) => {
    e.stopPropagation();

    // Find the file to remove
    const fileToRemove = uploadedFiles.find((file) => file.id === id);

    // Update the uploadedFiles state
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id));

    // Update formData
    if (setFormData) {
      setFormData((prev) => ({
        ...prev,
        documents: (prev.documents || []).filter(
          (file) =>
            !(file.name === fileToRemove.file.name && file.size === fileToRemove.file.size)
        ),
      }));
    }

    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(fileToRemove.url);
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-800 mb-4">Knowledge Base Setup</h2>

      {/* Drag and Drop Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
          isDragging ? "border-light-purple bg-purple-50" : "border-gray-300 hover:border-purple-400"
        } ${uploadedFiles.length >= MAX_FILES ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.pdf,.csv,.doc,.docx,.txt,.xls,.xlsx"
          multiple
          onChange={(e) => handleFileChange(e.target.files)}
          className="hidden"
        />

        <FaUpload className="text-gray-400 text-3xl mb-2" />
        <p className="text-gray-700 font-medium mb-1">
          {uploadedFiles.length >= MAX_FILES
            ? `Maximum ${MAX_FILES} files reached`
            : `Click to upload or drag and drop (${uploadedFiles.length}/${MAX_FILES})`}
        </p>
        <p className="text-sm text-gray-500">Supported formats: PDF, DOC, CSV, TXT, XLS (max. 10MB per file)</p>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium text-gray-700 mb-3">Uploaded Files</h3>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  {/* File Name with Clickable Link */}
                  <div>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-800 hover:underline"
                    >
                      {file.file.name}
                    </a>
                    <p className="text-xs text-gray-500">
                      {(file.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {/* Remove File Button */}
                <button
                  onClick={(e) => removeFile(file.id, e)}
                  className="text-gray-500 hover:text-red-500 p-2 transition-colors"
                  aria-label="Remove file"
                >
                  <FaTimes />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-3">Supported formats: PDF, DOC, CSV, TXT, XLS (max. 10MB per file).</p>
       {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 w-full">
                <button onClick={goBack} className="text-light-purple font-medium text-3xl hover:underline">
                  <IoMdArrowRoundBack />
                </button>
                <button
                  onClick={goNext}
                  className="bg-light-purple text-white px-8 py-2 rounded-xl transition hover:text-gray-800 hover:border-2 hover:border-light-purple hover:bg-white font-semibold"
                >
                  Next
                </button>
              </div>
    </div>
  );
};

export default KnowledgeBaseSetup;
