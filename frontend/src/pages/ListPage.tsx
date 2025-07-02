import { useEffect, useState } from "react";

type ParsedEntry = {
  _id: string;
  parser: string;
  original_filename?: string;
  uploaded_at?: string;
};

export default function ListPage() {
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

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
    setDeleting(fileId);
    setDeleteConfirm(null);
    
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
      <div className="min-h-screen bg-black text-grey-100 flex items-center justify-center p-6">
        <div className="text-grey-400 font-mono text-sm">
          loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-grey-100 flex items-center justify-center p-6">
        <div className="text-grey-400 font-mono text-sm">
          error: {error}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="min-h-screen bg-black text-grey-100 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="space-y-2 font-mono text-grey-400 mb-8">
            <div>~/documents</div>
          </div>
          <div className="text-grey-500 font-mono text-sm mb-8">
            directory is empty
          </div>
          <a
            href="/"
            className="text-grey-400 hover:text-grey-200 font-mono text-sm transition-colors duration-200"
          >
            ← upload first document
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-grey-100 p-6 flex flex-col">
      <div className="max-w-4xl mx-auto flex flex-col h-full w-full">
        {/* Navigation */}
        <div className="flex justify-between items-center border-b border-grey-800 pb-4 mb-8 flex-shrink-0">
          <a
            href="/"
            className="text-grey-500 hover:text-grey-300 font-mono text-xs transition-colors duration-200"
          >
            ← Upload
          </a>
          <button
            onClick={fetchList}
            className="text-grey-500 hover:text-grey-300 font-mono text-xs transition-colors duration-200"
          >
            refresh
          </button>
        </div>

        <div className="space-y-4 font-mono text-grey-400 mb-8 flex-shrink-0">
          <div>~/documents</div>
        </div>
        
        {/* Scrollable document list */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry._id}>
                <div className="flex justify-between items-center font-mono text-sm">
                  <div className="text-grey-300">
                    {entry.original_filename || "unknown.pdf"}
                  </div>
                  <div className="flex space-x-4 text-xs">
                    <a
                      href={`/preview/${entry._id}`}
                      className="text-grey-500 hover:text-grey-300 transition-colors"
                    >
                      view
                    </a>
                    <a
                      href={`http://127.0.0.1:8000/api/data/${entry._id}?pretty=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-grey-500 hover:text-grey-300 transition-colors"
                    >
                      json
                    </a>
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
                  <div className="mt-1 text-xs font-mono text-grey-500">
                    $ rm {entry.original_filename || "unknown.pdf"} — are you sure?
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-grey-500 font-mono text-xs flex-shrink-0">
          {entries.length} file{entries.length !== 1 ? 's' : ''} found
        </div>
      </div>
    </div>
  );
}
