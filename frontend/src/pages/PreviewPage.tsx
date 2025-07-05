import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPreviewComponent, hasCustomPreview, BaseParsedData } from "../components/preview/PreviewRegistry";
import Layout from "../components/Layout";
import { API_ENDPOINTS } from "../config/api";
import EditableDataEditor from "../components/EditableDataEditor";
import DynamicDataEditor from "../components/DynamicDataEditor";

// Use the BaseParsedData interface from registry
type ParsedData = BaseParsedData;

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

  // Track changes when editedData is modified
  useEffect(() => {
    if (isEditMode && editedData && data) {
      const hasModifications = JSON.stringify(editedData) !== JSON.stringify(data);
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
    } else {
      // Entering edit mode
      setIsEditMode(true);
      setEditedData(data ? { ...data } : null);
      setHasChanges(false);
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
      title={data.original_filename}
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
                    : 'text-grey-600 cursor-not-allowed'
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
              {/* View PDF Link */}
              <a
                href={API_ENDPOINTS.file(data.file_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-grey-400 hover:text-grey-200 font-mono text-xs transition-colors duration-200"
              >
                view pdf →
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
                      ? 'text-grey-600 cursor-not-allowed'
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
      {/* Content - either editable or preview */}
      {isEditMode ? (
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
    </Layout>
  );
}
