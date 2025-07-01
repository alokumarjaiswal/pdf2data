import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { commonStyles } from "../theme";

type ParsedEntry = {
  _id: string;
  parser: string;
  original_filename?: string;
  uploaded_at?: string;
};

export default function ListPage() {
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchList = async () => {
    try {
      setError(null);
      const res = await fetch("http://127.0.0.1:8000/api/list");
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
    if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return;
    }

    setDeleting(fileId);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/delete/${fileId}`, {
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

  useEffect(() => {
    fetchList();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border border-grey-500 border-t-grey-200 mx-auto mb-4"></div>
            <div className="text-lg text-grey-200 shiny-text">Loading documents...</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full flex flex-col items-center justify-center pt-16">
        {error && (
          <div className="mb-6 p-4 bg-grey-900 border border-grey-700 text-grey-300 shiny-text max-w-2xl">
            <div className="flex items-center justify-between">
              <span>Error: {error}</span>
              <button 
                onClick={() => setError(null)}
                className="text-grey-400 hover:text-grey-200 ml-4 shiny-text"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {entries.length === 0 ? (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto bg-grey-800 border border-grey-700 flex items-center justify-center mb-4">
              <span className="text-grey-300 text-xs font-mono shiny-text">EMPTY</span>
            </div>
            <h3 className="text-2xl font-semibold text-grey-100 mb-2 shiny-text-strong">No documents found</h3>
            <p className="text-grey-400 mb-6 shiny-text">Upload and parse your first PDF to get started.</p>
            <Link 
              to="/"
              className={`inline-flex items-center ${commonStyles.button.primary}`}
            >
              <span className="shiny-text-strong">Upload Your First Document</span>
            </Link>
          </div>
        ) : (
          <div className="w-full max-w-6xl flex flex-col" style={{height: 'calc(100% - 4rem)'}}>
            {/* Table Header - Fixed */}
            <div className="flex-shrink-0 border-b border-grey-800 pb-4 mb-4">
              <div className="grid grid-cols-4 gap-4 px-4">
                <div className="font-semibold text-grey-200 shiny-text-strong text-center">Document</div>
                <div className="font-semibold text-grey-200 shiny-text-strong text-center">Parser</div>
                <div className="font-semibold text-grey-200 shiny-text-strong text-center">Uploaded</div>
                <div className="font-semibold text-grey-200 shiny-text-strong text-center">Actions</div>
              </div>
            </div>

            {/* Scrollable Table Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                {entries.map((entry, index) => (
                  <div key={entry._id} className="grid grid-cols-4 gap-4 px-4 py-4 hover:bg-black hover:bg-opacity-30 transition-colors border-b border-grey-800 border-opacity-30">
                    {/* Document Column */}
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-10 h-10 bg-grey-800 border border-grey-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-grey-300 font-mono text-xs shiny-text">PDF</span>
                      </div>
                      <div className="min-w-0 flex-1 text-center">
                        <p className="font-medium text-grey-100 shiny-text-strong truncate">{entry.original_filename || "Unknown.pdf"}</p>
                        <p className="text-xs text-grey-400 shiny-text">ID: {entry._id}</p>
                      </div>
                    </div>

                    {/* Parser Column */}
                    <div className="flex items-center justify-center">
                      <span className="text-sm font-medium text-grey-300 shiny-text">
                        {entry.parser}
                      </span>
                    </div>

                    {/* Uploaded Column */}
                    <div className="flex items-center justify-center text-grey-300 shiny-text">
                      <div className="text-center">
                        {entry.uploaded_at ? (
                          <>
                            <div className="text-sm">{new Date(entry.uploaded_at).toLocaleDateString()}</div>
                            <div className="text-xs text-grey-400">{new Date(entry.uploaded_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </>
                        ) : (
                          "N/A"
                        )}
                      </div>
                    </div>

                    {/* Actions Column */}
                    <div className="flex items-center justify-center space-x-3">
                      <Link 
                        to={`/preview/${entry._id}`}
                        className="px-3 py-1 text-sm font-medium text-grey-300 hover:text-grey-100 transition-colors shiny-text"
                      >
                        View
                      </Link>
                      <a
                        href={`http://127.0.0.1:8000/api/data/${entry._id}?pretty=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm font-medium text-grey-300 hover:text-grey-100 transition-colors shiny-text"
                      >
                        JSON
                      </a>
                      <button
                        onClick={() => handleDelete(entry._id)}
                        disabled={deleting === entry._id}
                        className="px-3 py-1 text-sm font-medium text-grey-400 hover:text-grey-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shiny-text"
                      >
                        {deleting === entry._id ? (
                          <div className="flex items-center">
                            <div className="animate-spin w-3 h-3 border border-grey-500 border-t-grey-200 mr-2"></div>
                            <span>Deleting...</span>
                          </div>
                        ) : (
                          "Delete"
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
