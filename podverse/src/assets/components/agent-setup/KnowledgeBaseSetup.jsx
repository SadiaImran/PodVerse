import React, { useState, useEffect } from 'react';
import { Upload, FileText, Check, XCircle, Link, Loader2, ArrowLeft, Database } from 'lucide-react';

import axios from 'axios';
import { supabase, getSupabaseAuthorizedtoken } from '../../supabaseClient'

const FileUpload = ({ title, accept, onFileSelect, selectedFile, icon: Icon, disabled, onCancel }) => {
  return (
    <div 
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all flex flex-col ${disabled ? 'opacity-50' : 'hover:shadow-lg cursor-pointer'}`}
      style={{ 
        borderColor: selectedFile ? '#6057C7' : '#e5e7eb',
        backgroundColor: selectedFile ? '#f5f3ff' : 'white',
        minHeight: '400px',
        maxHeight: '400px'
      }}
    >
      <input
        type="file"
        accept={accept}
        onChange={e => onFileSelect(e.target.files[0])}
        className="hidden"
        id="file-upload"
        disabled={disabled}
      />
      <label htmlFor="file-upload" className={`flex flex-col items-center justify-center h-full ${selectedFile || disabled ? 'pointer-events-none' : 'cursor-pointer'}`}>
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl flex items-center justify-center" 
            style={{ backgroundColor: selectedFile ? '#6057C7' : '#f5f3ff' }}
          >
            <Icon className="w-16 h-16" style={{ color: selectedFile ? '#F9F5EB' : '#6057C7' }} />
          </div>
          <h3 className="text-xl font-semibold mb-3" style={{ color: '#1C1C1C' }}>{title}</h3>
        </div>
        
        {selectedFile ? (
          <div className="flex flex-col items-center gap-3" style={{ color: '#6057C7' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#6057C7' }}>
              <Check className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold mb-1">{selectedFile.name}</p>
              <p className="text-xs" style={{ color: '#6A6A6A' }}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium" style={{ color: '#6A6A6A' }}>Click to upload or drag and drop</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#e9e5ff', color: '#6057C7' }}>PDF</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#e9e5ff', color: '#6057C7' }}>TXT</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#e9e5ff', color: '#6057C7' }}>CSV</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#e9e5ff', color: '#6057C7' }}>JSON</span>
            </div>
          </div>
        )}
      </label>
      {selectedFile && (
        <button 
          type="button" 
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-red-50 transition-colors shadow-md" 
          onClick={onCancel} 
          aria-label="Remove file"
          style={{ backgroundColor: 'white', color: '#ef4444' }}
        >
          <XCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

const URLInput = ({ disabled, url, setUrl, onCancel }) => {
  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all flex flex-col ${disabled ? 'opacity-50' : 'hover:shadow-lg'}`}
      style={{ 
        borderColor: url ? '#6057C7' : '#e5e7eb',
        backgroundColor: url ? '#f5f3ff' : 'white',
        minHeight: '400px',
        maxHeight: '400px'
      }}
    >
      <div className="flex flex-col items-center justify-center h-full">
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl flex items-center justify-center" 
            style={{ backgroundColor: url ? '#6057C7' : '#f5f3ff' }}
          >
            <Link className="w-16 h-16" style={{ color: url ? '#F9F5EB' : '#6057C7' }} />
          </div>
          <h3 className="text-xl font-semibold mb-4" style={{ color: '#1C1C1C' }}>Add URL to Knowledge Base</h3>
        </div>
        
        <div className="space-y-4 w-full">
          <input
            type="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={disabled}
            className="w-full px-4 py-3 border-2 rounded-xl text-lg focus:outline-none focus:ring-2 transition-all"
            style={{
              borderColor: url ? '#6057C7' : '#e5e7eb',
              focusRingColor: '#6057C7'
            }}
            onFocus={(e) => {
              if (!url) {
                e.target.style.borderColor = '#6057C7';
                e.target.style.boxShadow = '0 0 0 3px rgba(96, 87, 199, 0.1)';
              }
            }}
            onBlur={(e) => {
              if (!url) {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }
            }}
          />
          {url && (
            <div className="flex flex-col items-center gap-3" style={{ color: '#6057C7' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#6057C7' }}>
                <Check className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold mb-1">URL ready to submit</p>
                <p className="text-xs break-all px-4" style={{ color: '#6A6A6A' }}>{url}</p>
              </div>
              <button 
                type="button" 
                onClick={onCancel} 
                className="mt-2 p-2 rounded-full hover:bg-red-50 transition-colors shadow-md"
                style={{ backgroundColor: 'white', color: '#ef4444' }}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
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
      <style>{`
        .kb-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .kb-scrollbar::-webkit-scrollbar-track {
          background: #f5f3ff;
          border-radius: 10px;
        }
        .kb-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #6057C7 0%, #A388E7 100%);
          border-radius: 10px;
        }
        .kb-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #4f46e5 0%, #8f7bff 100%);
        }
      `}</style>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#1C1C1C' }}>
        <Database className="w-5 h-5" style={{ color: '#6057C7' }} />
        Or select from existing knowledge bases:
      </h3>
      <div 
        className="space-y-3 overflow-y-auto pr-2 kb-scrollbar"
        style={{ 
          maxHeight: '400px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#6057C7 #f5f3ff'
        }}
      >
        {files.map((file) => {
          const isSelected = selectedFile?.id === file.id;
          return (
            <div
              key={file.id}
              onClick={() => !disabled && onFileSelect(file)}
              className={`group p-4 border-2 rounded-xl cursor-pointer transition-all flex items-center justify-between
                ${isSelected 
                  ? 'border-[#6057C7] bg-[#f5f3ff] shadow-md' 
                  : 'border-gray-200 hover:border-[#A388E7] hover:shadow-sm bg-white'
                }
                relative`}
              style={{ minHeight: 64 }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className={`p-2 rounded-lg ${isSelected ? 'bg-[#6057C7]' : 'bg-gray-100'}`}
                >
                  <FileText className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-semibold" style={{ color: isSelected ? '#1C1C1C' : '#1C1C1C' }}>
                    {file.file_name}
                  </p>
                  <p className="text-sm" style={{ color: '#6A6A6A' }}>
                    Uploaded {new Date(file.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center ml-auto gap-2">
                {isSelected && (
                  <button 
                    type="button" 
                    className="p-1.5 rounded-full hover:bg-red-50 transition-colors" 
                    onClick={e => { e.stopPropagation(); onCancel(); }} 
                    aria-label="Deselect file"
                    style={{ color: '#ef4444' }}
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
                {isSelected && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#6057C7' }}>
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
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
    <div className="rounded-[28px] border border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_20px_60px_rgba(96,87,199,0.1)] p-8 md:p-10 space-y-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2" style={{ color: '#6A6A6A' }}>Knowledge Base Setup</h2>
        <p style={{ color: '#6A6A6A' }}>Create a knowledge base for your AI assistant by uploading a document, adding a URL, or selecting a previously uploaded one.</p>
      </div>
      
      <div className="flex gap-2 bg-[#f5f3ff] rounded-full p-1 mb-6">
        <button
          onClick={() => setUploadType('file')}
          className={`px-5 py-2.5 font-semibold text-sm rounded-full transition-all flex items-center gap-2 ${
            uploadType === 'file' 
              ? 'shadow-md' 
              : ''
          }`}
          style={
            uploadType === 'file'
              ? { backgroundColor: '#6057C7', color: '#F9F5EB' }
              : { color: '#6057C7' }
          }
          onMouseEnter={(e) => {
            if (uploadType !== 'file') {
              e.currentTarget.style.backgroundColor = '#e9e5ff';
            }
          }}
          onMouseLeave={(e) => {
            if (uploadType !== 'file') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <Upload size={18} />
          Upload File
        </button>
        <button
          onClick={() => setUploadType('url')}
          className={`px-5 py-2.5 font-semibold text-sm rounded-full transition-all flex items-center gap-2 ${
            uploadType === 'url' 
              ? 'shadow-md' 
              : ''
          }`}
          style={
            uploadType === 'url'
              ? { backgroundColor: '#6057C7', color: '#F9F5EB' }
              : { color: '#6057C7' }
          }
          onMouseEnter={(e) => {
            if (uploadType !== 'url') {
              e.currentTarget.style.backgroundColor = '#e9e5ff';
            }
          }}
          onMouseLeave={(e) => {
            if (uploadType !== 'url') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <Link size={18} />
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
          <div className="flex items-center justify-center p-8 rounded-xl" style={{ backgroundColor: '#f5f3ff' }}>
            <Loader2 className="animate-spin w-6 h-6" style={{ color: '#6057C7' }} />
            <span className="ml-2 font-medium" style={{ color: '#6A6A6A' }}>Loading your files...</span>
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

      <div className="flex justify-between items-center pt-4">
        <button 
          onClick={goBack} 
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg"
          style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4f46e5';
            e.currentTarget.style.transform = 'translateX(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#6057C7';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <button
          onClick={handleUploadAndNext}
          disabled={!canProceed || isUploading}
          className="px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          style={
            canProceed && !isUploading
              ? { backgroundColor: '#6057C7', color: '#F9F5EB' }
              : { backgroundColor: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' }
          }
          onMouseEnter={(e) => {
            if (canProceed && !isUploading) {
              e.currentTarget.style.backgroundColor = '#4f46e5';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (canProceed && !isUploading) {
              e.currentTarget.style.backgroundColor = '#6057C7';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {isUploading ? (
            <>
              <Loader2 className="animate-spin w-5 h-5" />
              Uploading...
            </>
          ) : (
            'Next: AI Speaker Setup →'
          )}
        </button>
      </div>
    </div>
  );
};

export default KnowledgeBaseSetup;