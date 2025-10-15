import React, { useState, useEffect } from 'react';
import { Upload, FileText, Check, XCircle, Link, Loader2 } from 'lucide-react';
import { IoMdArrowRoundBack } from "react-icons/io";

import axios from 'axios';
import { supabase, getSupabaseAuthorizedtoken } from '../../supabaseClient'

const FileUpload = ({ title, accept, onFileSelect, selectedFile, icon: Icon, disabled, onCancel }) => {
  return (
    <div className={`relative border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors ${disabled ? 'opacity-50' : ''}`}>
      <input
        type="file"
        accept={accept}
        onChange={e => onFileSelect(e.target.files[0])}
        className="hidden"
        id="file-upload"
        disabled={disabled}
      />
      <label htmlFor="file-upload" className={`block ${selectedFile || disabled ? 'pointer-events-none' : 'cursor-pointer'}`}>
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
        <button type="button" className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={onCancel} aria-label="Remove file">
          <XCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

const URLInput = ({ disabled, url, setUrl, onCancel }) => {
  return (
    <div className={`border-2 border-dashed border-gray-200 rounded-xl p-8 text-center ${disabled ? 'opacity-50' : ''}`}>
      <Link className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-700 mb-4">Add URL to Knowledge Base</h3>
      <div className="space-y-3">
        <input
          type="url"
          placeholder="https://example.com/article"
          value={url}
          onChange={e => setUrl(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {url && (
          <div className="flex items-center justify-center text-green-600 gap-2">
            <Check className="w-4 h-4" />
            <span className="text-sm">URL ready to submit</span>
            <button type="button" onClick={onCancel} className="ml-2 text-red-400 hover:text-red-600">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

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
                  <button type="button" className="text-red-400 hover:text-red-600 mr-2" onClick={e => { e.stopPropagation(); onCancel(); }} aria-label="Deselect file">
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

const KnowledgeBaseSetup = ({ goNext, goBack }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedExistingFile, setSelectedExistingFile] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [existingFiles, setExistingFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [uploadType, setUploadType] = useState('file');

  const API_URL = "http://localhost:8000";

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
   
        if (res.data) {
          setExistingFiles(res.data);
        } else {
          console.error("Unexpected response format:", res.data);
          alert("Unexpected response format from server. Please try again later.");
        }

      } catch (error) {
        const serverMessage = error.response?.data?.message || error.message;
        alert(`Fetching failed: ${serverMessage}`);
      } finally {
        setIsLoadingFiles(false);
      }
    };

    fetchExistingFiles();
  }, []);

  const handleNewFileSelect = (file) => {
    setUploadedFile(file);
    setSelectedExistingFile(null);
    setUrlInput('');
  };

  const handleExistingFileSelect = (file) => {
    setSelectedExistingFile(file);
    setUploadedFile(null);
    setUrlInput('');
  };

  const handleUrlChange = (url) => {
    setUrlInput(url);
    setUploadedFile(null);
    setSelectedExistingFile(null);
  };

  const handleCancelNewFile = () => {
    setUploadedFile(null);
  };

  const handleCancelExistingFile = () => {
    setSelectedExistingFile(null);
  };

  const handleCancelUrl = () => {
    setUrlInput('');
  };

  const handleUploadAndNext = async () => {
    if (!uploadedFile && !selectedExistingFile && !urlInput) {
      alert("Please upload a file, enter a URL, or select an existing one.");
      return;
    }

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

        const res = await axios.post(API_URL + "/upload-knowledge-base/", formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        });

        const kb_id = res.data.kb_id;
        console.log("✅ Captured kb_id:", kb_id);

        // Store knowledge base info with kb_id
        const knowledgeBaseInfo = {
          type: 'new',
          fileName: uploadedFile.name,
          kb_id: kb_id  // ← Store the kb_id
        };
        
        localStorage.setItem('selectedKnowledgeBase', JSON.stringify(knowledgeBaseInfo));
        sessionStorage.setItem('current_kb_id', kb_id);  

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
    else if (urlInput) {
      setIsUploading(true);
      alert("Processing URL... This may take a moment.");

      try {
        const token = await getSupabaseAuthorizedtoken();
        if (!token) {
          alert("You must be signed in to add URLs.");
          setIsUploading(false);
          return;
        }

        const formData = new FormData();
        formData.append("url", urlInput);

        const res = await axios.post(API_URL + "/add-url-knowledge-base/", formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        });

        const kb_id = res.data.kb_id;
        console.log("✅ Captured kb_id from URL:", kb_id);

        // Store knowledge base info with kb_id
        const knowledgeBaseInfo = {
          type: 'url',
          url: urlInput,
          kb_id: kb_id  // ← Store the kb_id
        };
        
        localStorage.setItem('selectedKnowledgeBase', JSON.stringify(knowledgeBaseInfo));
        sessionStorage.setItem('current_kb_id', kb_id);  // ← Also store separately for easy access

        alert("URL added successfully!");
        console.log("Response from server:", res.data);
        if (goNext) goNext();

      } catch (error) {
        const serverMessage = error.response?.data?.message || error.message;
        console.error("URL processing failed:", serverMessage);
        alert(`URL processing failed: ${serverMessage}`);
      } finally {
        setIsUploading(false);
      }
    }
    else if (selectedExistingFile) {
      // ✅ USE EXISTING FILE'S KB_ID
      const kb_id = selectedExistingFile.id;
      console.log("✅ Using existing file kb_id:", kb_id);

      const knowledgeBaseInfo = {
        type: 'existing',
        id: selectedExistingFile.id,
        fileName: selectedExistingFile.file_name,
        kb_id: kb_id  // ← Store the kb_id
      };
      
      localStorage.setItem('selectedKnowledgeBase', JSON.stringify(knowledgeBaseInfo));
      sessionStorage.setItem('current_kb_id', kb_id);  
      console.log("Stored existing knowledge base info in localStorage:", knowledgeBaseInfo);
      console.log("Stored current_kb_id in sessionStorage:", kb_id);

      alert(`Using existing file: ${selectedExistingFile.file_name}.`);
      console.log(`Proceeding with existing file. KB ID: ${kb_id}`);
      if (goNext) goNext();
    }
  };

  const canProceed = uploadedFile || selectedExistingFile || urlInput;

  return (
    <div className="p-8 bg-white rounded-xl shadow-md space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Knowledge Base Setup</h2>
      <p className="text-gray-600">Create a knowledge base for your AI assistant by uploading a document, adding a URL, or selecting a previously uploaded one.</p>
      
      <div className="flex gap-2 border-b border-gray-200 mb-4">
        <button
          onClick={() => setUploadType('file')}
          className={`px-4 py-2 font-medium transition-colors ${
            uploadType === 'file' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Upload File
        </button>
        <button
          onClick={() => setUploadType('url')}
          className={`px-4 py-2 font-medium transition-colors ${
            uploadType === 'url' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Add URL
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {uploadType === 'file' ? (
          <FileUpload
            title="Upload New Document"
            accept=".pdf,.txt,.csv,.json"
            onFileSelect={handleNewFileSelect}
            selectedFile={uploadedFile}
            icon={Upload}
            disabled={!!selectedExistingFile || !!urlInput}
            onCancel={handleCancelNewFile}
          />
        ) : (
          <URLInput
            url={urlInput}
            setUrl={handleUrlChange}
            disabled={!!uploadedFile || !!selectedExistingFile}
            onCancel={handleCancelUrl}
          />
        )}

        <div className="flex items-center justify-center md:hidden">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="px-4 text-sm text-gray-500">OR</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

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
            disabled={!!uploadedFile || !!urlInput}
            onCancel={handleCancelExistingFile}
          />
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>Supported formats:</strong> PDF, TXT, CSV, JSON files and web URLs
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={goBack} className="text-purple-600 font-medium text-3xl hover:underline">
          <IoMdArrowRoundBack />
        </button>
        <button
          onClick={handleUploadAndNext}
          disabled={!canProceed || isUploading}
          className={`px-8 py-2 rounded-xl font-semibold transition-all ${
            canProceed && !isUploading
              ? 'bg-purple-600 text-white hover:text-gray-800 hover:border-2 hover:border-purple-600 hover:bg-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="animate-spin w-5 h-5 mr-2 inline" />
              Uploading...
            </>
          ) : (
            'Next'
          )}
        </button>
      </div>
    </div>
  );
};

export default KnowledgeBaseSetup;