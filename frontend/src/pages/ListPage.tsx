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
        <div className="min-h-96 flex items-center justify-center">
          <div className="text-grey-400 font-mono text-xs">
            error: {error}
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
                    {entry.unite_status === 'success' ? '✓ unite' :
                     entry.unite_status === 'error' ? '✗ unite' :
                     entry.unite_status === 'uploading' || uploading === entry._id ? '⟳ unite' :
                     '↑ unite'}
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
