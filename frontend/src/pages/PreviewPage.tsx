import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPreviewComponent, hasCustomPreview, BaseParsedData } from "../components/preview/PreviewRegistry";
import Layout from "../components/Layout";
import { API_ENDPOINTS } from "../config/api";
import EditableDataEditor from "../components/EditableDataEditor";
import DynamicDataEditor from "../components/DynamicDataEditor";

// Use the BaseParsedData interface from registry
type ParsedData = BaseParsedData;

// Deep comparison function for change detection
function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 !== 'object') return obj1 === obj2;
  
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (let key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

export default function PreviewPage() {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState<ParsedData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPDF, setShowPDF] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Track changes when editedData is modified
  useEffect(() => {
    if (isEditMode && editedData && data) {
      const hasModifications = !deepEqual(editedData, data);
      setHasChanges(hasModifications);
    } else {
      setHasChanges(false);
    }
  }, [editedData, data, isEditMode]);  const handleSave = async () => {
    if (!fileId || (!data && !editedData)) return;
    
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // If in edit mode, we need to save the edited data first
      if (isEditMode && editedData) {
        await handleSaveEdits();
      }
      
      const response = await fetch(API_ENDPOINTS.save(fileId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update the data to reflect the saved status
      setData(prevData => prevData ? { ...prevData, saved: true, saved_at: result.saved_at } : null);
      
      // Redirect to List page after successful save
      navigate('/list');
      
    } catch (err) {
      console.error("Failed to save document", err);
      setSaveMessage("Failed to save document. Please try again.");
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      // Exiting edit mode - ask if user wants to save changes
      if (hasChanges) {
        if (window.confirm('You have unsaved changes. Do you want to save them?')) {
          handleSaveEdits();
        } else {
          setEditedData(null);
          setHasChanges(false);
        }
      }
      setIsEditMode(false);
      setIsTransitioning(false);
    } else {
      // Entering edit mode with transition spinner
      setIsTransitioning(true);
      
      // Use setTimeout to allow spinner to show before heavy processing
      setTimeout(() => {
        setIsEditMode(true);
        // Deep clone the data to prevent reference issues
        setEditedData(data ? JSON.parse(JSON.stringify(data)) : null);
        setHasChanges(false);
        setIsTransitioning(false);
      }, 50); // Small delay to ensure spinner renders
    }
  };

  const handleSaveEdits = async () => {
    if (!fileId || !editedData) return;
    
    try {
      // Update the parsed data in the database
      const response = await fetch(API_ENDPOINTS.updateParsedData(fileId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Update the local data state
      setData(editedData);
      
      // Exit edit mode and go to preview
      setIsEditMode(false);
      setEditedData(null);
      setHasChanges(false);
      
    } catch (err) {
      console.error("Failed to save edits", err);
      setSaveMessage("Failed to save changes. Please try again.");
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedData(null);
    setHasChanges(false);
  };

  useEffect(() => {
    if (!fileId) {
      setError("No file ID provided");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setError(null);
        const res = await fetch(API_ENDPOINTS.data(fileId));
        
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

  // Determine if document is saved
  const isSaved = data.saved === true;
  const showSaveButton = !isSaved && data.parsed !== false; // Show save button for parsed documents that aren't saved
  
  // Use edited data if in edit mode, otherwise use original data
  const displayData = isEditMode ? editedData : data;

  return (
    <Layout 
      fullViewport={showPDF} // Use full viewport when PDF is shown
      title={
        <div className="flex items-center gap-3">
          <span>{data.original_filename}</span>
          <button
            onClick={() => {
              // Start PDF loading when toggling to show
              if (!showPDF) {
                setPdfLoading(true);
              }
              setShowPDF(!showPDF);
            }}
            className={`flex items-center justify-center w-6 h-6 rounded transition-all duration-200 ${
              showPDF 
                ? 'text-grey-200 hover:text-grey-100 bg-grey-800 hover:bg-grey-700' 
                : 'text-grey-500 hover:text-grey-300 hover:bg-grey-900'
            }`}
            title={showPDF ? 'Hide PDF' : 'Show PDF side-by-side'}
          >
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${showPDF ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              {pdfLoading && !showPDF ? (
                /* Loading spinner when PDF is loading */
                <circle 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" 
                  strokeDasharray="31.416" 
                  strokeDashoffset="31.416"
                  className="animate-spin"
                />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              )}
            </svg>
          </button>
        </div>
      }
      subtitle={
        <span className="flex items-center gap-2">
          {`Parsed with ${data.parser} • ${hasCustomPreview(data.parser) ? 'Custom Preview' : 'JSON Preview'} ${isSaved ? `• Saved ${data.saved_at ? new Date(data.saved_at).toLocaleString('en-US', {
            month: 'numeric',
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }) : ''}` : '• Pending Approval'}`}
          {isEditMode && (
            <span className="inline-flex items-center justify-center">
              <span className="w-2 h-2 bg-grey-400 rounded-full animate-pulse"></span>
            </span>
          )}
        </span>
      }
      rightNavItems={
        <div className="flex items-center gap-4">
          {/* Save Status Message */}
          {saveMessage && (
            <div className={`text-xs font-mono px-3 py-1 rounded ${
              saveMessage.includes('successfully') 
                ? 'bg-green-900/30 text-green-400 border border-green-800' 
                : 'bg-red-900/30 text-red-400 border border-red-800'
            }`}>
              {saveMessage}
            </div>
          )}
          
          {/* Edit Mode Controls */}
          {isEditMode ? (
            <>
              <button
                onClick={handleSaveEdits}
                disabled={!hasChanges}
                className={`font-mono text-xs transition-colors duration-200 ${
                  hasChanges
                    ? 'text-grey-400 hover:text-grey-200 cursor-pointer'
                    : 'text-grey-600'
                }`}
              >
                save changes
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-grey-500 hover:text-grey-300 font-mono text-xs transition-colors duration-200"
              >
                cancel
              </button>
              {/* View Raw Data Link */}
              <a
                href={API_ENDPOINTS.extractedText(data.file_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-grey-400 hover:text-grey-200 font-mono text-xs transition-colors duration-200"
              >
                view raw data →
              </a>
            </>
          ) : (
            <>
              {/* Edit Button */}
              <button
                onClick={handleEditToggle}
                className="text-grey-500 hover:text-grey-300 font-mono text-xs transition-colors duration-200"
              >
                edit
              </button>
              
              {/* Save Button */}
              {showSaveButton && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`text-xs font-mono transition-all duration-200 ${
                    isSaving
                      ? 'text-grey-600'
                      : 'text-grey-500 hover:text-grey-300 shiny-text'
                  }`}
                >
                  {isSaving ? 'saving...' : 'save'}
                </button>
              )}
              
              {/* Raw JSON Link - only show when not in edit mode */}
              <a
                href={API_ENDPOINTS.dataWithPretty(data.file_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-grey-500 hover:text-grey-300 font-mono text-xs transition-colors duration-200"
              >
                view raw json →
              </a>
            </>
          )}
        </div>
      }
    >
      {/* Main Content Area - Responsive Layout */}
      {showPDF ? (
        /* Side-by-side view with independent scrolling - Full Viewport */
        <div className="flex gap-6 h-full px-6">
          {/* Data Content - Scrollable Container */}
          <div className="flex-1 min-w-0 overflow-auto">
            <div className="h-full py-6">
              {isTransitioning ? (
                /* Transition Spinner */
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin w-6 h-6 border border-grey-500 border-t-grey-200 rounded-full mx-auto mb-2"></div>
                    <div className="text-grey-400 font-mono text-xs">Loading editor...</div>
                  </div>
                </div>
              ) : isEditMode ? (
                data?.parser === 'DaybookParser' ? (
                  <EditableDataEditor
                    data={editedData}
                    onChange={setEditedData}
                    onSave={handleSaveEdits}
                  />
                ) : (
                  <DynamicDataEditor
                    data={editedData}
                    onChange={setEditedData}
                    onSave={handleSaveEdits}
                  />
                )
              ) : (
                displayData && (
                  <PreviewComponent
                    data={displayData}
                    originalFilename={data.original_filename}
                    fileId={data.file_id}
                  />
                )
              )}
            </div>
          </div>

          {/* PDF Viewer - Scrollable Container */}
          <div className="flex-1 min-w-0 transition-all duration-300 py-6">
            <div className="h-full border border-grey-800 rounded-lg overflow-hidden bg-grey-950 relative">
              {/* PDF Loading Overlay */}
              {pdfLoading && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-grey-500 border-t-grey-200 rounded-full mx-auto mb-3"></div>
                    <div className="text-grey-300 font-mono text-sm mb-1">Loading PDF...</div>
                    <div className="text-grey-500 font-mono text-xs">Large files may take a moment</div>
                  </div>
                </div>
              )}
              <iframe
                src={API_ENDPOINTS.file(data.file_id)}
                className="w-full h-full border-0"
                title="Original PDF"
                onLoad={() => setPdfLoading(false)}
                onError={() => setPdfLoading(false)}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Full-width view - normal scrolling */
        <div className="w-full">
          {isTransitioning ? (
            /* Transition Spinner */
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin w-6 h-6 border border-grey-500 border-t-grey-200 rounded-full mx-auto mb-2"></div>
                <div className="text-grey-400 font-mono text-xs">Loading editor...</div>
              </div>
            </div>
          ) : isEditMode ? (
            data?.parser === 'DaybookParser' ? (
              <EditableDataEditor
                data={editedData}
                onChange={setEditedData}
                onSave={handleSaveEdits}
              />
            ) : (
              <DynamicDataEditor
                data={editedData}
                onChange={setEditedData}
                onSave={handleSaveEdits}
              />
            )
          ) : (
            displayData && (
              <PreviewComponent
                data={displayData}
                originalFilename={data.original_filename}
                fileId={data.file_id}
              />
            )
          )}
        </div>
      )}
    </Layout>
  );
}
