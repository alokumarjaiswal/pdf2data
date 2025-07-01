import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPreviewComponent, hasCustomPreview, BaseParsedData } from "../components/preview/PreviewRegistry";
import Layout from "../components/Layout";
import { commonStyles } from "../theme";

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
      <Layout title="Loading Preview" subtitle="Please wait while we load your document data">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-lg text-gray-600">Loading preview...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Preview Error" subtitle="Unable to load document preview">
        <div className="max-w-2xl mx-auto">
          <div className={commonStyles.alert.error}>
            <div className="flex items-center">
              <span className="text-red-600 mr-2">⚠️</span>
              <div>
                <h3 className="font-bold">Error loading preview</h3>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout title="No Data" subtitle="No document data available">
        <div className="max-w-2xl mx-auto">
          <div className={`${commonStyles.card} text-center py-12`}>
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-gray-400 text-2xl">📄</span>
            </div>
            <h3 className={`${commonStyles.heading.h3} mb-2`}>No Data Available</h3>
            <p className="text-gray-500">The requested document data could not be found.</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Use the preview registry to get the appropriate component
  const PreviewComponent = getPreviewComponent(data.parser);
  const hasCustomView = hasCustomPreview(data.parser);

  return (
    <>
      {!hasCustomView && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex items-center">
            <span className="text-yellow-600 mr-2">ℹ️</span>
            <div>
              <p className="text-sm text-yellow-700">
                <strong>Note:</strong> No custom preview available for "{data.parser}" parser. 
                Showing generic JSON view.
              </p>
            </div>
          </div>
        </div>
      )}
      <PreviewComponent
        data={data}
        originalFilename={data.original_filename}
        fileId={data.file_id}
      />
    </>
  );
}
