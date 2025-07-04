import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../config/api";

const DEFAULT_PROMPT = `Analyze both the text and image to extract structured data. Focus on names, dates, amounts, organizations, and locations. Use visual context to understand tables, forms, and layouts.`;

const DEFAULT_SCHEMA = `{
  "entities": [
    {
      "type": "person|organization|amount|date|location",
      "value": "extracted value",
      "context": "surrounding context"
    }
  ],
  "summary": "brief document summary",
  "confidence": 0.95
}`;

export default function AIParserConfigPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const fileId = searchParams.get("file_id");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [schema, setSchema] = useState(DEFAULT_SCHEMA);
  const [pageNum, setPageNum] = useState(1); // 1-indexed for user
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pagePreview, setPagePreview] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [needsExtraction, setNeedsExtraction] = useState(false);
  const [extractionInfo, setExtractionInfo] = useState<any>(null);
  const [originalFilename, setOriginalFilename] = useState<string>("");
  
  const validateJsonSchema = (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  };

  // Fetch document info to get page count and check extraction status
  useEffect(() => {
    const fetchDocumentInfo = async () => {
      if (!fileId) {
        setError("No file ID provided");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(API_ENDPOINTS.data(fileId));
        if (!response.ok) throw new Error("Failed to fetch document info");
        
        const data = await response.json();
        const extractionInfo = data.extraction_info;
        
        console.log("Document data:", data);
        console.log("Extraction info:", extractionInfo);
        
        // Set original filename
        setOriginalFilename(data.original_filename || "Unknown.pdf");
        
        // Check if extraction exists and is valid (allow upload_count for immediate navigation)
        if (!extractionInfo || 
            extractionInfo.mode === "fallback" || 
            extractionInfo.mode === "direct_count" ||
            !extractionInfo.pages ||
            extractionInfo.pages <= 0) {
          
          console.log("No valid extraction found, needs extraction");
          setNeedsExtraction(true);
          setTotalPages(1); // Temporary fallback
          setExtractionInfo(null);
        } else if (extractionInfo.mode === "upload_count") {
          console.log("Upload page count found, allowing navigation but still needs extraction for AI parsing");
          setNeedsExtraction(true); // Still need extraction for AI parsing
          setTotalPages(extractionInfo.pages);
          setExtractionInfo(extractionInfo);
        } else {
          console.log("Valid extraction found:", extractionInfo);
          setNeedsExtraction(false);
          setTotalPages(extractionInfo.pages);
          setExtractionInfo(extractionInfo);
        }
      } catch (err) {
        console.error("Error fetching document info:", err);
        setError("Failed to load document information");
        setTotalPages(1); // Fallback
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocumentInfo();
  }, [fileId]);

  // Fetch page preview when page number changes (allow preview with upload_count)
  useEffect(() => {
    const fetchPagePreview = async () => {
      const hasPageInfo = totalPages && totalPages > 0;
      const isValidPageNum = totalPages && pageNum >= 1 && pageNum <= totalPages;
      const hasNoExtractionAtAll = needsExtraction && !extractionInfo;
      
      if (!fileId || !hasPageInfo || !isValidPageNum || hasNoExtractionAtAll) {
        console.log(`Skipping preview fetch: fileId=${fileId}, totalPages=${totalPages}, pageNum=${pageNum}, needsExtraction=${needsExtraction}, hasExtractionInfo=${!!extractionInfo}`);
        return;
      }

      console.log(`Fetching preview for page ${pageNum}...`);
      setLoadingPreview(true);
      setPagePreview(null); // Clear previous preview immediately
      
      try {
        // Add timestamp to prevent caching
        const url = `${API_ENDPOINTS.pagePreview(fileId, pageNum)}?t=${Date.now()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Preview fetch failed: ${response.status} - ${errorText}`);
          throw new Error(`Failed to fetch page preview: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Successfully fetched preview for page ${pageNum}`);
        
        if (data.success && data.image) {
          setPagePreview(data.image);
        } else {
          throw new Error("Invalid preview data received");
        }
      } catch (err) {
        console.error("Error fetching page preview:", err);
        setPagePreview(null);
        // Don't show error to user for preview failures, just show fallback
      } finally {
        setLoadingPreview(false);
      }
    };

    // Add a small delay to avoid rapid API calls when user is quickly changing pages
    const timeoutId = setTimeout(fetchPagePreview, 300);
    
    return () => clearTimeout(timeoutId);
  }, [fileId, pageNum, totalPages, needsExtraction]);

  const handlePageChange = (newPageNum: number) => {
    if (newPageNum >= 1 && newPageNum <= (totalPages || 1)) {
      console.log(`Page changed: ${pageNum} -> ${newPageNum}`);
      setPageNum(newPageNum);
    }
  };

  const handleExtractFirst = () => {
    // Navigate to extract page with current file_id
    navigate(`/extract?file_id=${fileId}`);
  };

  const handleProceed = async () => {
    // Prevent multiple parse attempts
    if (isValidating) {
      return;
    }
    
    setError("");
    setIsValidating(true);
    
    if (!fileId) {
      setError("No file ID provided");
      setIsValidating(false);
      return;
    }

    // Double-check extraction exists before proceeding
    if (needsExtraction) {
      setError("Please extract the document first before parsing");
      setIsValidating(false);
      return;
    }

    if (!prompt.trim()) {
      setError("Instructions cannot be empty");
      setIsValidating(false);
      return;
    }

    if (!validateJsonSchema(schema)) {
      setError("Invalid JSON format");
      setIsValidating(false);
      return;
    }

    try {
      // Convert to 0-indexed for backend
      const params = new URLSearchParams({
        file_id: fileId,
        parser: 'AIParser',
        prompt: prompt,
        json_schema: schema,
        page_num: (pageNum - 1).toString() // Convert to 0-indexed
      });
      
      navigate(`/parse-execution?${params.toString()}`);
    } catch (err) {
      setError("Navigation error");
      console.error("Navigation error:", err);
      setIsValidating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-black text-grey-100 flex items-center justify-center">
        <div className="text-grey-400">Loading document info...</div>
      </div>
    );
  }

  // Show extraction required message
  if (needsExtraction) {
    return (
      <div className="h-screen bg-black text-grey-100 flex flex-col overflow-hidden">
        
        {/* Top Navigation */}
        <div className="w-full bg-black border-b border-grey-800 flex-shrink-0">
          <div className="max-w-full mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              {/* Left Navigation */}
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => navigate(`/parse?file_id=${fileId}`)}
                  className="text-xs font-mono text-grey-500 hover:text-grey-300 transition-colors duration-200"
                >
                  ← Back
                </button>
                <span className="text-xs font-mono text-grey-400">AI Parser Configuration</span>
              </div>
              
              {/* Right Navigation - Status Info */}
              <div className="flex items-center space-x-4">
                {originalFilename && (
                  <span className="text-xs font-mono text-grey-500">{originalFilename}</span>
                )}
                <span className="text-xs font-mono text-yellow-400">⚠ Extraction required</span>
              </div>
            </div>
          </div>
        </div>

        {/* Extraction Required Message */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="mb-6">
              <svg className="w-16 h-16 mx-auto text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 6.5c-.77.833-.192 2.5 1.732 2.5z" />
              </svg>
              <h2 className="text-xl font-semibold text-white mb-2">Extraction Required</h2>
              <p className="text-grey-400 mb-6">
                The AI parser requires extracted text to analyze your document. Please extract the document first before configuring AI parsing.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleExtractFirst}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Extract Document First
              </button>
              <button
                onClick={() => navigate(`/parse?file_id=${fileId}`)}
                className="w-full px-6 py-3 bg-grey-700 hover:bg-grey-600 text-grey-300 rounded-lg transition-colors text-sm font-medium"
              >
                Go Back
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-grey-900/50 rounded-lg border border-grey-700/50">
              <h3 className="text-sm font-medium text-grey-300 mb-2">Why is extraction needed?</h3>
              <p className="text-xs text-grey-500">
                The AI parser analyzes the extracted text content from your PDF along with visual elements. 
                Without extraction, there's no text content for the AI to process and understand.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-grey-100 flex flex-col overflow-hidden">
      
      {/* Top Navigation */}
      <div className="w-full bg-black border-b border-grey-800 flex-shrink-0">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Left Navigation */}
            <div className="flex items-center space-x-6">
              <button
                onClick={() => navigate(`/parse?file_id=${fileId}`)}
                className="text-xs font-mono text-grey-500 hover:text-grey-300 transition-colors duration-200"
              >
                ← Back
              </button>
              <span className="text-xs font-mono text-grey-400">AI Parser Configuration</span>
            </div>
            
            {/* Right Navigation - Status Info */}
            <div className="flex items-center space-x-4">
              {originalFilename && (
                <span className="text-xs font-mono text-grey-500">{originalFilename}</span>
              )}
              {extractionInfo && (
                <span className="text-xs font-mono text-green-400">✓ Ready for AI parsing</span>
              )}
              {isValidating && (
                <span className="text-xs font-mono text-blue-400">● Parsing...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Three Equal Columns */}
      <div className="flex-1 flex overflow-hidden gap-4 p-6">
        
        {/* Column 1 - Instructions */}
        <div className="flex-1 flex flex-col">
          <label className="block text-sm font-medium text-grey-300 mb-3">Instructions</label>
          <div className="flex-1 bg-grey-900/30 rounded-lg border border-grey-700/30 p-4 flex flex-col">
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setError("");
              }}
              className="flex-1 p-4 bg-transparent border border-grey-700/50 rounded-lg text-grey-100 text-sm placeholder-grey-500 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500/20 transition-all resize-none"
              placeholder="How should the AI analyze your document?"
            />
            <div className="mt-3 text-right">
              <span className="text-xs text-grey-500">{prompt.length} chars</span>
            </div>
          </div>
        </div>

        {/* Column 2 - Output Format */}
        <div className="flex-1 flex flex-col">
          <label className="block text-sm font-medium text-grey-300 mb-3">Output Format</label>
          <div className="flex-1 bg-grey-900/30 rounded-lg border border-grey-700/30 p-4 flex flex-col">
            <textarea
              value={schema}
              onChange={(e) => {
                setSchema(e.target.value);
                setError("");
              }}
              className={`flex-1 p-4 bg-transparent border rounded-lg text-grey-100 text-sm placeholder-grey-500 focus:outline-none focus:ring-1 transition-all resize-none font-mono ${
                validateJsonSchema(schema) 
                  ? 'border-grey-700/50 focus:border-green-500/50 focus:ring-green-500/20' 
                  : 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
              }`}
              placeholder="Expected JSON structure..."
            />
            <div className="mt-3 flex justify-between items-center">
              <span className={`text-xs ${validateJsonSchema(schema) ? 'text-green-400' : 'text-red-400'}`}>
                {validateJsonSchema(schema) ? '✓ Valid JSON' : '✗ Invalid JSON'}
              </span>
              <span className="text-xs text-grey-500">{schema.length} chars</span>
            </div>
          </div>
        </div>

        {/* Column 3 - Page Browser */}
        <div className="flex-1 flex flex-col">
          <label className="block text-sm font-medium text-grey-300 mb-3 flex-shrink-0">Page Preview</label>
          
          {/* Document Browser */}
          <div className="flex-1 bg-grey-900/30 rounded-lg border border-grey-700/30 p-4 flex flex-col min-h-0">
            


            {/* Page Preview Display */}
            <div className="flex-1 flex flex-col justify-center min-h-0 overflow-hidden">
              {totalPages && (
                <>
                  {/* Main Page Preview */}
                  <div className="flex-1 flex flex-col mb-4 min-h-0 max-h-full">
                    <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
                      {loadingPreview ? (
                        <div className="text-grey-400">
                          <div className="animate-spin w-8 h-8 border-2 border-grey-400 border-t-grey-200 rounded-full mx-auto mb-3"></div>
                          <span className="text-sm">Loading page preview...</span>
                        </div>
                      ) : pagePreview ? (
                        <img 
                          src={pagePreview} 
                          alt={`Page ${pageNum}`}
                          className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
                        />
                      ) : (
                        <div className="text-grey-500">
                          <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm">Preview unavailable</span>
                        </div>
                      )}
                    </div>
                    <div className="text-center mt-3">
                      <span className="text-white text-sm font-medium">Page {pageNum}</span>
                    </div>
                  </div>



                  {/* Seamless Page Navigation */}
                  <div className="flex items-center justify-center flex-shrink-0">
                    <div className="flex items-center bg-grey-800/30 rounded-xl px-2 py-1 gap-1">
                      {/* Previous Button */}
                      <button
                        onClick={() => handlePageChange(pageNum - 1)}
                        disabled={pageNum <= 1}
                        className="p-2 text-grey-400 hover:text-grey-200 hover:bg-grey-700/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      
                      {/* Page Input with Label */}
                      <div className="flex items-center px-3 py-2 gap-2">
                        <span className="text-grey-400 text-sm">Page</span>
                        <input
                          type="text"
                          value={pageNum}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers
                            if (value === '') {
                              setPageNum(1);
                              return;
                            }
                            const numValue = Math.max(1, Math.min(totalPages, parseInt(value)));
                            handlePageChange(numValue);
                          }}
                          onBlur={(e) => {
                            // Ensure valid page number on blur
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            if (value === '' || parseInt(value) < 1) {
                              handlePageChange(1);
                            } else if (parseInt(value) > totalPages) {
                              handlePageChange(totalPages);
                            }
                          }}
                          className="w-12 bg-grey-900/40 border border-grey-700/30 rounded-md text-white text-sm text-center px-2 py-1 focus:outline-none focus:border-grey-500/50 focus:bg-grey-900/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-grey-500 text-sm">of {totalPages}</span>
                      </div>
                      
                      {/* Next Button */}
                      <button
                        onClick={() => handlePageChange(pageNum + 1)}
                        disabled={pageNum >= totalPages}
                        className="p-2 text-grey-400 hover:text-grey-200 hover:bg-grey-700/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Action Bar */}
      <div className="w-full bg-black flex-shrink-0">
        <div className="max-w-full mx-auto px-6 py-6">
          {/* Error Messages */}
          {error && (
            <div className="text-center mb-4">
              <span className="text-red-400 text-xs font-mono">{error}</span>
            </div>
          )}
          
          {/* Centered Parse Button */}
          <div className="flex justify-center">
            <button
              onClick={handleProceed}
              disabled={!fileId || isValidating || !validateJsonSchema(schema) || !prompt.trim()}
              className={`group relative py-3 px-6 transition-all duration-200 font-mono shiny-text ${
                !fileId || isValidating || !validateJsonSchema(schema) || !prompt.trim()
                  ? 'text-grey-500 cursor-not-allowed opacity-50'
                  : 'text-grey-200 hover:bg-white hover:text-black cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2">
                {isValidating ? (
                  <>
                    <div className="w-3 h-3 border border-black/20 border-t-black rounded-full animate-spin"></div>
                    <span>Parsing</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>Parse</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 