import { useState, useRef } from "react";
import { FaUpload, FaTimes } from "react-icons/fa";
import { IoMdArrowRoundBack } from "react-icons/io";
import { useAuth } from "../../context/AuthContext"; // For current user
import { supabase } from "../../../connection_supabase_client"; // Import supabase client

const KnowledgeBaseSetup = ({ formData, setFormData, goNext, goBack }) => {
  const { user } = useAuth(); // Get user from context
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  // const { userData } = useAuth(); // commented out for now
  const [isUploading, setIsUploading] = useState(false);

  const handleClick = () => {
    if (!uploadedFile) fileInputRef.current.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf" && file.size <= 10 * 1024 * 1024) {
      updateFile(file);
    } else {
      alert("Only PDF files up to 10MB are allowed.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf" && file.size <= 10 * 1024 * 1024) {
      updateFile(file);
    } else {
      alert("Only PDF files up to 10MB are allowed.");
    }
  };

  const updateFile = (file) => {
    setUploadedFile({
      file,
      url: URL.createObjectURL(file),
    });

    if (setFormData) {
      setFormData((prev) => ({
        ...prev,
        document: file,
      }));
    }
  };

  const removeFile = () => {
    if (uploadedFile) {
      URL.revokeObjectURL(uploadedFile.url);
      setUploadedFile(null);
      setFormData((prev) => ({
        ...prev,
        document: null,
      }));
    }
  };

  const handleUploadAndNext = async () => {
    if (!uploadedFile) {
      alert("Please upload a PDF file.");
      return;
    }

    setIsUploading(true);
    alert("Uploading document... This may take a few minutes depending on the file size.");

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session?.user) {
        alert("You must be signed in to upload documents.");
        setIsUploading(false);
        return;
      }

      const file = uploadedFile.file;
      const fileExt = file.name.split('.').pop();
      const fileName = `${session?.user.id}_${Date.now()}.${fileExt}`;
      const filePath = `knowledge-base/${fileName}`;

    //   const { data: existingResume, error } = await supabase
    //   .from('resumes')
    //   .select('id')
    //   .eq('user_id', user.id)
    //   .eq('file_name', file.name);

    // if (existingResume.length > 0) {
    //   alert("A file with this name already exists. Please rename it and try again.");
    //   setIsLoading(false);
    //   return null;
    // }

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('knowledge-base')
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload failed:", uploadError.message);
        return null;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('knowledge-base')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      if (!publicUrl) {
        console.error("Failed to get public URL for uploaded file.");
        return null;
      }
      // Save file metadata to database
          setIsUploading(false);
          console.log("Uploaded:", publicUrl);
          alert("Document uploaded successfully!");
          goNext();
        } catch (err) {
          console.error("Upload error:", err.message);
          alert("Upload failed. Please try again.");
        } finally {
          setIsUploading(false);
        }
      };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-800 mb-4">Knowledge Base Setup</h2>

      <div
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors ${
          isDragging ? "border-light-purple bg-purple-50" : "border-gray-300 hover:border-purple-400"
        } ${uploadedFile ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          className="hidden"
        />
        <FaUpload className="text-gray-400 text-3xl mb-2" />
        <p className="text-gray-700 font-medium mb-1">
          {uploadedFile ? "PDF Uploaded" : "Click or drag a PDF to upload"}
        </p>
        <p className="text-sm text-gray-500">Only 1 PDF file allowed (max. 10MB)</p>
      </div>

      {uploadedFile && (
        <div className="mt-6">
          <h3 className="font-medium text-gray-700 mb-3">Uploaded File</h3>
          <div className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100">
            <div>
              <a
                href={uploadedFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-800 hover:underline"
              >
                {uploadedFile.file.name}
              </a>
              <p className="text-xs text-gray-500">
                {(uploadedFile.file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={removeFile}
              className="text-gray-500 hover:text-red-500 p-2 transition-colors"
              aria-label="Remove file"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4 w-full">
        <button
          onClick={goBack}
          className="text-light-purple font-medium text-3xl hover:underline"
        >
          <IoMdArrowRoundBack />
        </button>
        <button
          onClick={handleUploadAndNext}
          disabled={isUploading}
          className={`bg-light-purple text-white px-8 py-2 rounded-xl transition font-semibold ${
            isUploading ? "opacity-50 cursor-not-allowed" : "hover:text-gray-800 hover:border-2 hover:border-light-purple hover:bg-white"
          }`}
        >
          {isUploading ? "Uploading..." : "Next"}
        </button>
      </div>
    </div>
  );
};

export default KnowledgeBaseSetup;
