import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { commonStyles } from "../theme";
import { API_ENDPOINTS } from "../config/api";

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Cleanup blob URL when component unmounts or when uploadedFileUrl changes
  useEffect(() => {
    return () => {
      if (uploadedFileUrl) {
        URL.revokeObjectURL(uploadedFileUrl);
      }
    };
  }, [uploadedFileUrl]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);

    // File size validation (50MB limit)
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSizeBytes) {
      setError(`File too large. Maximum size is 50MB. Your file is ${formatFileSize(file.size)}.`);
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(API_ENDPOINTS.upload, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // Enhanced error handling to parse backend JSON errors
        try {
          const errorData = await response.json();
          if (errorData.detail && typeof errorData.detail === 'object' && errorData.detail.message) {
            throw new Error(errorData.detail.message);
          } else if (errorData.detail) {
            throw new Error(String(errorData.detail));
          }
          throw new Error(`Upload failed with status: ${response.status}`);
        } catch (jsonError) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
      }

      const result = await response.json();
      const uploadedFileId = result.file_id;
      
      // Clean up any existing blob URL before creating a new one
      if (uploadedFileUrl) {
        URL.revokeObjectURL(uploadedFileUrl);
      }
      
      // Create URL for PDF display
      const fileUrl = URL.createObjectURL(file);
      setUploadedFileUrl(fileUrl);
      setFileId(uploadedFileId);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload PDF. Please try again.");
      console.error(err);
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      // Only set dragActive to false if we're leaving the main container
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      
      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        setDragActive(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        setError(null);
        handleUpload(file);
      } else {
        setError("Please select a PDF file.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        setError(null);
        handleUpload(file);
      } else {
        setError("Please select a PDF file.");
      }
    }
  };

  const handleNewUpload = () => {
    // Clean up the previous blob URL before setting new values
    if (uploadedFileUrl) {
      URL.revokeObjectURL(uploadedFileUrl);
    }
    
    setSelectedFile(null);
    setUploadedFileUrl(null);
    setFileId(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleContinueToExtract = () => {
    if (fileId) {
      navigate(`/extract?file_id=${fileId}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Layout
      fullViewport={true}
      rightNavItems={uploadedFileUrl ? (
        <>
          <button
            onClick={handleNewUpload}
            className="text-grey-500 hover:text-grey-300 font-mono text-xs transition-colors duration-200"
          >
            Upload New
          </button>
          <button
            onClick={handleContinueToExtract}
            className="text-grey-200 hover:text-white font-mono text-xs transition-colors duration-200"
          >
            Continue to Extract
          </button>
        </>
      ) : undefined}
    >
      {uploadedFileUrl ? (
        // PDF Viewer Mode
        <div className="h-full flex flex-col">
          {/* Expanded PDF Viewer */}
          <div className="flex-1 w-full">
            <iframe
              src={`${uploadedFileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              className="w-full h-full border-0"
              title={selectedFile?.name || "PDF Viewer"}
              name={selectedFile?.name || "PDF Document"}
              style={{
                background: 'transparent',
                filter: 'invert(0) contrast(1.05) brightness(1)'
              }}
            />
          </div>
        </div>
      ) : (
        // Upload Mode - Centered to viewport
        <div className="h-full flex items-center justify-center relative">
          {/* Full viewport drop zone */}
          <div
            className={`absolute inset-0 transition-all duration-200 ${
              dragActive 
                ? 'bg-grey-900 bg-opacity-30' 
                : 'hover:bg-grey-900 hover:bg-opacity-5'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
          </div>

          {/* Centered Upload Interface */}
          <div className="w-full max-w-2xl z-20 pointer-events-none text-center">
            <div className="space-y-4">
              {!uploading ? (
                <>
                  <div className="w-16 h-16 mx-auto bg-grey-800 border border-grey-700 flex items-center justify-center">
                    <span className="text-grey-300 text-xs font-mono shiny-text">PDF</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-grey-100 mb-2 shiny-text-strong">
                      Drop PDF here or click to browse
                    </h3>
                    <p className="text-grey-400 shiny-text">
                      Supports PDF files up to 50MB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto bg-grey-700 border border-grey-600 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border border-grey-500 border-t-grey-200"></div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-grey-100 mb-1 shiny-text-strong">
                      Uploading...
                    </h3>
                    <p className="text-grey-400 shiny-text">
                      Processing your PDF
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-black bg-opacity-50 text-grey-300 shiny-text text-center pointer-events-auto">
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
