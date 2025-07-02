import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPreviewComponent, hasCustomPreview, BaseParsedData } from "../components/preview/PreviewRegistry";
import Layout from "../components/Layout";

// Use the BaseParsedData interface from registry
type ParsedData = BaseParsedData;

export default function PreviewPage() {
  const { fileId } = useParams();
  const [data, setData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId) {
      setError("No file ID provided");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setError(null);
        const res = await fetch(`http://127.0.0.1:8000/api/data/${fileId}`);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const parsedData = await res.json();
        setData(parsedData);
      } catch (err) {
        console.error("Failed to load preview data", err);
        setError(err instanceof Error ? err.message : "Failed to load preview data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fileId]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border border-grey-500 border-t-grey-200 rounded-full mx-auto mb-4"></div>
            <div className="text-grey-300 font-mono shiny-text">Loading preview...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-96 flex items-center justify-center">
          <div className="w-full max-w-2xl text-center">
            <div className="p-6 bg-grey-900 border border-grey-800">
              <p className="text-grey-400 font-mono shiny-text mb-2">Error loading preview</p>
              <p className="text-grey-500 text-sm font-mono">{error}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="min-h-96 flex items-center justify-center">
          <div className="w-full max-w-2xl text-center">
            <div className="p-6 bg-grey-900 border border-grey-800">
              <p className="text-grey-400 font-mono shiny-text">No data available</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Use the preview registry to get the appropriate component
  const PreviewComponent = getPreviewComponent(data.parser);

  return (
    <Layout 
      title={data.original_filename}
      subtitle={`Parsed with ${data.parser} • ${hasCustomPreview(data.parser) ? 'Custom Preview' : 'JSON Preview'}`}
      rightNavItems={
        <a
          href={`http://127.0.0.1:8000/api/data/${data.file_id}?pretty=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-grey-500 hover:text-grey-300 font-mono text-xs transition-colors duration-200"
        >
          view raw json →
        </a>
      }
    >
      {/* Preview Component */}
      <PreviewComponent
        data={data}
        originalFilename={data.original_filename}
        fileId={data.file_id}
      />
    </Layout>
  );
}
