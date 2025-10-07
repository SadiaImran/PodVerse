import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, Check, XCircle, ArrowRight, Ban, Loader2 } from 'lucide-react';
import { supabase , getSupabaseAuthorizedtoken } from '../../supabaseClient'

// You can reuse your FileUpload component or a simplified version
const FileUpload = ({ title, accept, onFileSelect, selectedFile, icon: Icon, disabled, onCancel }) => {
  return (
    <div
      className={`relative border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors ${disabled ? 'opacity-50' : ''}`}
    >
      <input
        type="file"
        accept={accept}
        onChange={e => onFileSelect(e.target.files[0])}
        className="hidden"
        id="file-upload"
        disabled={disabled}
      />
      <label
        htmlFor="file-upload"
        className={`block ${selectedFile || disabled ? 'pointer-events-none' : 'cursor-pointer'}`}
      >
        <Icon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">{title}</h3>
        {selectedFile ? (
          <div className="flex items-center justify-center text-green-600 gap-2">
            <Check className="w-4 h-4" />
            <span className="text-sm">{selectedFile.name}</span>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Click to upload or drag and drop</p>
        )}
      </label>
      {selectedFile && (
        <button
          type="button"
          className="absolute top-2 right-2 text-red-400 hover:text-red-600"
          onClick={onCancel}
          aria-label="Remove file"
        >
          <XCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

// New component to display existing knowledge base files
const ExistingFilesSelector = ({ files, selectedFile, onFileSelect, disabled, onCancel }) => {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <h3 className="text-lg font-medium text-gray-700 mb-4">Or select from existing knowledge bases:</h3>
      <div className="grid gap-3">
        {files.map((file) => {
          const isSelected = selectedFile?.id === file.id;
          return (
            <div
              key={file.id}
              onClick={() => !disabled && onFileSelect(file)}
              className={`group p-4 border rounded-lg cursor-pointer transition-all flex items-center justify-between
                ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                relative`}
              style={{ minHeight: 56 }}
            >
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-700">{file.file_name}</p>
                  <p className="text-sm text-gray-500">
                    Uploaded {new Date(file.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center ml-auto">
                {isSelected && (
                  <button
                    type="button"
                    className="text-red-400 hover:text-red-600 mr-2"
                    onClick={e => { e.stopPropagation(); onCancel(); }}
                    aria-label="Deselect file"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
                {isSelected && <Check className="w-5 h-5 text-blue-500" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const KnowledgeBaseSetup = ({ goNext }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedExistingFile, setSelectedExistingFile] = useState(null);
  const [existingFiles, setExistingFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const API_URL = "http://localhost:8000";

  // --- LOGIC TO FETCH EXISTING FILES ---
  useEffect(() => {
    const fetchExistingFiles = async () => {
      setIsLoadingFiles(true);
      
      try {
          const token = await getSupabaseAuthorizedtoken();
          if (!token) {
            setIsLoadingFiles(false);
            return;
          }

          const res = await axios.get(API_URL + "/knowledge-base/", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }

        });
   
        if(res.data) {
          setExistingFiles(res.data);
        } else {
          console.error("Unexpected response format:", res.data);
          alert("Unexpected response format from server. Please try again later.");
        }

      } catch (error) {
         const serverMessage = error.response?.data?.message || error.message;
         alert(`Fetching failed: ${serverMessage}`)
      }finally {
        setIsLoadingFiles(false);
      }
    };

    fetchExistingFiles();
  }, []);

  // --- HANDLER FUNCTIONS TO MANAGE SELECTION ---
  const handleNewFileSelect = (file) => {
    setUploadedFile(file);
    setSelectedExistingFile(null); // Deselect any existing file
  };
  const handleExistingFileSelect = (file) => {
    setSelectedExistingFile(file);
    setUploadedFile(null); // Clear any newly uploaded file
  };
  const handleCancelNewFile = () => {
    setUploadedFile(null);
  };
  const handleCancelExistingFile = () => {
    setSelectedExistingFile(null);
  };

  // KnowledgeBaseSetup.js
const handleUploadAndNext = async () => {
  if (!uploadedFile && !selectedExistingFile) {
    alert("Please upload a PDF file or select an existing one.");
    return;
  }

  // Store the selected knowledge base information in localStorage or context
  const knowledgeBaseInfo = uploadedFile 
    ? { type: 'new', fileName: uploadedFile.name }
    : { type: 'existing', id: selectedExistingFile.id, fileName: selectedExistingFile.file_name };
  
  localStorage.setItem('selectedKnowledgeBase', JSON.stringify(knowledgeBaseInfo));

  // Case 1: User uploaded a NEW file
  if (uploadedFile) {
    setIsUploading(true);
    alert("Uploading document... This may take a few minutes depending on the file size.");

    try {
      const token = await getSupabaseAuthorizedtoken();
      if (!token) {
        alert("You must be signed in to upload documents.");
        setIsUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", uploadedFile);

      const res = await axios.post(API_URL +"/upload-knowledge-base/", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      alert("Document uploaded successfully!");
      console.log("Response from server:", res.data);
      if (goNext) goNext();

    } catch (error) {
      const serverMessage = error.response?.data?.message || error.message;
      console.error("Upload failed:", serverMessage);
      alert(`Upload failed: ${serverMessage}`);
    } finally {
      setIsUploading(false);
    }
  }

  // Case 2: User selected an EXISTING file
  else if (selectedExistingFile) {
    alert(`Using existing file: ${selectedExistingFile.file_name}.`);
    console.log(`Proceeding with existing file. Storage path: ${selectedExistingFile.storage_path}`);
    if (goNext) goNext();
  }
};

  const canProceed = uploadedFile || selectedExistingFile;

  return (
    <div className="p-8 bg-white rounded-xl shadow-md space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Knowledge Base Setup</h2>
      <p className="text-gray-600">Create a knowledge base for your AI assistant by uploading a document or selecting a previously uploaded one.</p>
      
      <div className="grid md:grid-cols-2 gap-8 ">
        {/* New File Upload Section */}
        <FileUpload
          title="Upload a New PDF"
          accept=".pdf, .doc, .docx, .txt"
          onFileSelect={handleNewFileSelect}
          selectedFile={uploadedFile}
          icon={Upload}
          disabled={!!selectedExistingFile}
          onCancel={handleCancelNewFile}
        />

        {/* OR Divider */}
        <div className="flex items-center justify-center md:hidden">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="px-4 text-sm text-gray-500">OR</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

        {/* Existing Files Section */}
        {isLoadingFiles ? (
          <div className="flex items-center justify-center p-8 bg-gray-50 rounded-xl">
            <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
            <span className="ml-2 text-gray-500">Loading your files...</span>
          </div>
        ) : (
          <ExistingFilesSelector
            files={existingFiles}
            selectedFile={selectedExistingFile}
            onFileSelect={handleExistingFileSelect}
            disabled={!!uploadedFile}
            onCancel={handleCancelExistingFile}
          />
        )}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleUploadAndNext}
          disabled={!canProceed || isUploading}
          className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center ${
            canProceed && !isUploading
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg transform hover:scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="animate-spin w-5 h-5 mr-2" />
              Uploading...
            </>
          ) : (
            <>
              <ArrowRight className="w-5 h-5 mr-2" />
              Next Step
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default KnowledgeBaseSetup;