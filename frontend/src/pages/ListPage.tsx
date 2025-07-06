import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { API_ENDPOINTS } from "../config/api";

type ParsedEntry = {
  _id: string;
  parser: string;
  original_filename?: string;
  uploaded_at?: string;
  unite_status?: 'pending' | 'uploading' | 'success' | 'error';
  unite_uploaded_at?: string;
};

export default function ListPage() {
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchList = async () => {
    try {
      setError(null);
      const res = await fetch(API_ENDPOINTS.list);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (err) {
      console.error("Failed to load list", err);
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    // Prevent multiple delete attempts
    if (deleting === fileId) {
      return;
    }
    
    setDeleting(fileId);
    setDeleteConfirm(null);
    
    try {
      const res = await fetch(API_ENDPOINTS.delete(fileId), {
        method: "DELETE",
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // Remove the deleted entry from the list
      setEntries(prev => prev.filter(entry => entry._id !== fileId));
    } catch (err) {
      console.error("Failed to delete document", err);
      setError(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setDeleting(null);
    }
  };

  const handleUniteUpload = async (fileId: string) => {
    if (uploading === fileId) {
      return;
    }
    
    setUploading(fileId);
    
    try {
      const res = await fetch(API_ENDPOINTS.uniteUpload(fileId), {
        method: "POST",
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const result = await res.json();
      
      // Update the entry status
      setEntries(prev => prev.map(entry => 
        entry._id === fileId 
          ? { ...entry, unite_status: 'uploading' as const }
          : entry
      ));
      
      // You could implement polling here to check status
      // For now, we'll just show it as uploading
      
    } catch (err) {
      console.error("Failed to upload to Unite", err);
      setError(err instanceof Error ? err.message : "Failed to upload to Unite");
      
      // Update entry to show error
      setEntries(prev => prev.map(entry => 
        entry._id === fileId 
          ? { ...entry, unite_status: 'error' as const }
          : entry
      ));
    } finally {
      setUploading(null);
    }
  };

  const handleDownloadExcel = async (fileId: string, filename: string) => {
    if (downloading === fileId) {
      return;
    }
    
    setDownloading(fileId);
    setError(null); // Clear any previous errors
    
    try {
      const response = await fetch(API_ENDPOINTS.exportExcel(fileId), {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = `${errorMessage} - ${response.statusText}`;
        }
        
        // Provide user-friendly error messages
        if (response.status === 404) {
          errorMessage = "Document not found. Please refresh the page and try again.";
        } else if (response.status === 400) {
          errorMessage = "Document must be saved before exporting to Excel.";
        } else if (response.status === 500) {
          errorMessage = "Server error while generating Excel file. Please try again later.";
        } else if (response.status >= 500) {
          errorMessage = "Server is temporarily unavailable. Please try again later.";
        }
        
        throw new Error(errorMessage);
      }
      
      // Verify that we received an Excel file
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('spreadsheetml')) {
        throw new Error('Invalid file format received from server');
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Verify blob size
      if (blob.size === 0) {
        throw new Error('Empty file received from server');
      }
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${filename.replace('.pdf', '')}.xlsx`;
      
      // Add to DOM and click
      document.body.appendChild(a);
      a.click();
      
      // Cleanup after a short delay to ensure download starts
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 100);
      
      // Clear any existing errors on successful download
      setError(null);
      
    } catch (err) {
      console.error("Failed to download Excel file", err);
      
      // Set user-friendly error message
      let userMessage = "Failed to download Excel file";
      if (err instanceof Error) {
        userMessage = err.message;
      } else if (typeof err === 'string') {
        userMessage = err;
      }
      
      // Handle network errors specifically
      if (err instanceof TypeError && err.message.includes('fetch')) {
        userMessage = "Network error. Please check your connection and try again.";
      }
      
      setError(userMessage);
      
      // Auto-clear error after 10 seconds to prevent UI from staying broken
      setTimeout(() => {
        setError(null);
      }, 10000);
      
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  if (loading) {
    return (
      <Layout 
        rightNavItems={
          <button
            onClick={fetchList}
            className="text-grey-500 hover:text-grey-300 font-mono text-xs transition-colors duration-200"
          >
            refresh
          </button>
        }
      >
        <div className="min-h-96 flex items-center justify-center">
          <div className="text-grey-400 font-mono text-xs">
            loading...
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout 
        rightNavItems={
          <button
            onClick={fetchList}
            className="text-grey-500 hover:text-grey-300 font-mono text-xs transition-colors duration-200"
          >
            refresh
          </button>
        }
      >
        {/* Error Banner - Dismissible */}
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="text-red-400 font-mono text-sm mb-1">Error</div>
              <div className="text-grey-300 font-mono text-xs">{error}</div>
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                onClick={fetchList}
                className="text-red-400 hover:text-red-300 font-mono text-xs transition-colors"
              >
                retry
              </button>
              <button
                onClick={() => setError(null)}
                className="text-grey-500 hover:text-grey-300 font-mono text-xs transition-colors"
              >
                dismiss
              </button>
            </div>
          </div>
        </div>
        
        <div className="min-h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="text-grey-400 font-mono text-xs mb-4">
              Unable to load documents
            </div>
            <button
              onClick={fetchList}
              className="px-4 py-2 bg-grey-800 border border-grey-700 text-grey-300 font-mono text-xs hover:bg-grey-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (entries.length === 0) {
    return (
      <Layout 
        rightNavItems={
          <button
            onClick={fetchList}
            className="text-grey-500 hover:text-grey-300 font-mono text-xs transition-colors duration-200"
          >
            refresh
          </button>
        }
      >
        <div className="min-h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="space-y-1 font-mono text-grey-400 mb-6">
              <div className="text-xs">~/documents</div>
            </div>
            <div className="text-grey-500 font-mono text-xs">
              directory is empty
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      rightNavItems={
        <button
          onClick={fetchList}
          className="text-grey-500 hover:text-grey-300 font-mono text-xs transition-colors duration-200"
        >
          refresh
        </button>
      }
    >
      <div className="font-mono">
        {/* Inline Error Banner for operation failures */}
        {error && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-700/50 rounded">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-red-400 font-mono text-xs mb-1">⚠️ Operation Failed</div>
                <div className="text-grey-300 font-mono text-xs">{error}</div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-grey-500 hover:text-grey-300 font-mono text-xs transition-colors ml-3"
                title="Dismiss error"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <div className="text-xs text-grey-400 mb-1">~/documents</div>
          <div className="text-xs text-grey-500">
            {entries.length} file{entries.length !== 1 ? 's' : ''} found
          </div>
        </div>
        
        {/* Document list */}
        <div className="space-y-1">
          {entries.map((entry) => (
            <div key={entry._id}>
              <div className="flex justify-between items-center text-xs">
                <div className="text-grey-300">
                  <a
                    href={`/preview/${entry._id}`}
                    className="hover:text-grey-100 transition-colors cursor-pointer"
                  >
                    {entry.original_filename || "unknown.pdf"}
                  </a>
                </div>
                <div className="flex space-x-3 text-xs">
                  {/* Download Excel Button */}
                  <button
                    onClick={() => handleDownloadExcel(entry._id, entry.original_filename || "unknown.pdf")}
                    disabled={downloading === entry._id}
                    className={`transition-colors ${
                      downloading === entry._id
                        ? 'text-grey-600'
                        : 'text-green-400 hover:text-green-300'
                    }`}
                    title="Download as Excel"
                  >
                    {downloading === entry._id ? '⟳' : '↓'}
                  </button>
                  
                  {/* Unite Upload Button */}
                  <button
                    onClick={() => handleUniteUpload(entry._id)}
                    disabled={uploading === entry._id || entry.unite_status === 'uploading' || entry.unite_status === 'success'}
                    className={`transition-colors ${
                      entry.unite_status === 'success'
                        ? 'text-green-400'
                        : entry.unite_status === 'error'
                        ? 'text-red-400 hover:text-red-300'
                        : entry.unite_status === 'uploading' || uploading === entry._id
                        ? 'text-grey-600'
                        : 'text-blue-400 hover:text-blue-300'
                    }`}
                    title={
                      entry.unite_status === 'success' ? 'Uploaded to Unite' :
                      entry.unite_status === 'error' ? 'Upload failed - click to retry' :
                      entry.unite_status === 'uploading' ? 'Uploading...' :
                      'Upload to Unite ERP'
                    }
                  >
                    {entry.unite_status === 'success' ? '✓' :
                     entry.unite_status === 'error' ? '✗' :
                     entry.unite_status === 'uploading' || uploading === entry._id ? '⟳' :
                     '↑'}
                  </button>
                  
                  {deleteConfirm === entry._id ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDelete(entry._id)}
                        disabled={deleting === entry._id}
                        className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                      >
                        {deleting === entry._id ? 'deleting...' : 'confirm'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-grey-500 hover:text-grey-300 transition-colors"
                      >
                        cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(entry._id)}
                      className="text-grey-600 hover:text-red-400 transition-colors"
                    >
                      rm
                    </button>
                  )}
                </div>
              </div>
              
              {deleteConfirm === entry._id && (
                <div className="mt-0.5 text-xs text-grey-500">
                  $ rm {entry.original_filename || "unknown.pdf"} — are you sure?
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
