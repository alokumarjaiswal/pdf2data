import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { API_ENDPOINTS } from "../config/api";

export default function ParseExecutionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [originalFilename, setOriginalFilename] = useState<string>("");
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fileId = searchParams.get("file_id");
  const parser = searchParams.get("parser");
  const prompt = searchParams.get("prompt");
  const jsonSchema = searchParams.get("json_schema");
  const pageNum = searchParams.get("page_num");

  // Fetch document info to get original filename
  useEffect(() => {
    const fetchDocumentInfo = async () => {
      if (!fileId) return;

      try {
        const response = await fetch(API_ENDPOINTS.data(fileId));
        if (!response.ok) throw new Error("Failed to fetch document info");
        
        const data = await response.json();
        setOriginalFilename(data.original_filename || "Unknown.pdf");
      } catch (err) {
        console.error("Error fetching document info:", err);
      }
    };

    fetchDocumentInfo();
  }, [fileId]);

  // Cleanup function
  const cleanup = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  // Blinking cursor effect
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (message: string, isCommand: boolean = false) => {
    const timestamp = new Date().toLocaleString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    if (isCommand) {
      setLogs(prev => [...prev, `pdf2data@parser:~$ ${message}`]);
    } else {
      setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    }
  };

  const executeParsing = async () => {
    // Prevent multiple parse executions
    if (loading && abortControllerRef.current) {
      return;
    }
    
    if (!fileId || !parser) {
      addLog("✗ ERROR: Missing required parameters");
      setError("Missing required parameters");
      setLoading(false);
      return;
    }

    setError(null);
    addLog("PDF2Data Parser Terminal v1.0.0");
    addLog("Initializing parsing environment...");
    addLog(`parse --parser=${parser} --file=${fileId}`, true);
    addLog("Looking for extracted text file...");
    addLog("Preparing data for parsing...");

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    // Set up timeout (30 seconds for most parsers, 120 seconds for AI parser, 90 seconds for DaybookParser)
    const timeoutDuration = parser === 'AIParser' ? 120000 : 
                           parser === 'DaybookParser' ? 90000 : 30000;
    const timeout = setTimeout(() => {
      if (abortControllerRef.current) {
        addLog("⚠ Request timed out, but parsing may still be running...");
        addLog("⚠ Checking if parsing completed successfully...");
        
        // Don't abort immediately, check if parsing completed
        checkParsingStatus();
      }
    }, timeoutDuration);
    
    setTimeoutId(timeout);

    const formData = new FormData();
    formData.append("file_id", fileId);
    formData.append("parser", parser);
    
    // Add AIParser-specific parameters if they exist
    if (prompt) {
      formData.append("prompt", prompt);
      addLog("✓ Custom AI prompt provided");
    }
    if (jsonSchema) {
      formData.append("json_schema", jsonSchema);
      addLog("✓ Custom JSON schema provided");
    }
    if (pageNum) {
      formData.append("page_num", pageNum);
      addLog(`✓ Image analysis enabled for page ${parseInt(pageNum) + 1}`);
    }

    try {
      addLog("Sending parsing request to server...");
      
      const res = await fetch(API_ENDPOINTS.parse, {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      // Clear timeout on successful response
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = `Server error: ${res.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch {
          // If not JSON, use the raw text
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }

      const result = await res.json();
      
      addLog("✓ Parsing completed successfully!");
      addLog(`✓ Parser used: ${result.parser_used}`);
      addLog(`✓ Extraction method: ${result.extraction_mode_used?.toUpperCase()}`);
      addLog("✓ Data saved to database");
      addLog(`✓ Output file: ${result.saved_as}`);
      addLog("✓ Process completed!");

      setSuccess(true);
      setLoading(false);

      // Show redirect command
      setTimeout(() => {
        addLog("cd ../preview && ./open_results.sh", true);
        addLog("Redirecting to results...");
        
        setTimeout(() => {
          navigate(`/preview/${fileId}`);
        }, 1000);
      }, 500);

    } catch (err: any) {
      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }

      if (err.name === 'AbortError') {
        addLog("✗ Parsing cancelled by user");
        addLog("✗ Process terminated");
        setError("Parsing was cancelled.");
      } else {
        addLog("✗ ERROR: Parsing failed!");
        addLog(`✗ ${err instanceof Error ? err.message : 'Unknown error'}`);
        addLog("✗ Process terminated with exit code 1");
        
        // Enhanced error messages for AIParser
        let errorMessage = "Parsing failed. Please try again or select a different parser.";
        
        if (parser === 'AIParser') {
          if (err instanceof Error && err.message.includes('API key')) {
            errorMessage = "OpenAI API key error. Please check your OPENAI_API_KEY environment variable.";
          } else if (err instanceof Error && err.message.includes('JSON')) {
            errorMessage = "AI response format error. Try simplifying your JSON schema or prompt.";
          } else if (err instanceof Error && err.message.includes('quota')) {
            errorMessage = "OpenAI quota exceeded. Please check your API usage limits.";
          } else if (prompt || jsonSchema) {
            errorMessage = "AI parsing failed with custom configuration. Try using default settings or simplify your prompt/schema.";
          } else {
            errorMessage = "AI parsing failed. Please check your OpenAI API key and try again.";
          }
        }
        
        setError(errorMessage);
      }
      
      setLoading(false);
    } finally {
      // Cleanup
      abortControllerRef.current = null;
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
    }
  };

  // Function to check if parsing completed successfully after timeout
  const checkParsingStatus = async () => {
    if (!fileId) return;

    // Define timeoutDuration here as in executeParsing
    const timeoutDuration = parser === 'AIParser' ? 120000 : 
                            parser === 'DaybookParser' ? 90000 : 30000;
    
    try {
      addLog("🔍 Checking parsing status...");
      const response = await fetch(API_ENDPOINTS.data(fileId));
      
      if (response.ok) {
        const data = await response.json();
        
        // Check if we have parsed data
        if (data.tables && data.tables.length > 0) {
          addLog("✅ Parsing completed successfully!");
          addLog(`✅ Found ${data.tables.length} tables with parsed data`);
          addLog("✅ Data saved to database");
          addLog("✅ Process completed!");
          
          setSuccess(true);
          setLoading(false);
          
          // Clear timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
          }
          
          // Show redirect command
          setTimeout(() => {
            addLog("cd ../preview && ./open_results.sh", true);
            addLog("Redirecting to results...");
            
            setTimeout(() => {
              navigate(`/preview/${fileId}`);
            }, 1000);
          }, 500);
          
          return;
        }
      }
      
      // If we get here, parsing hasn't completed successfully
      addLog("✗ Parsing did not complete successfully");
      addLog(`✗ Parser took longer than ${timeoutDuration / 1000} seconds`);
      addLog("✗ Process terminated due to timeout");
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      setError(`Parsing timed out after ${timeoutDuration / 1000} seconds. The document may be too large or complex for this parser.`);
      setLoading(false);
      
    } catch (err) {
      addLog("✗ Error checking parsing status");
      addLog(`✗ Parser took longer than ${timeoutDuration / 1000} seconds`);
      addLog("✗ Process terminated due to timeout");
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      setError(`Parsing timed out after ${timeoutDuration / 1000} seconds. The parser may be overloaded or there might be an issue with the document.`);
      setLoading(false);
    }
  };

  // Start parsing when component mounts
  useEffect(() => {
    // Add initial log to show the page is working
    addLog("=== Parse Execution Page Loaded ===");
    addLog("Initializing parser execution environment...");
    
    // Small delay to let user see initial logs
    const initTimer = setTimeout(() => {
      executeParsing();
    }, 500);

    return () => clearTimeout(initTimer);
  }, []);

  const handleCancel = () => {
    if (loading && abortControllerRef.current) {
      // If parsing is active, cancel it
      addLog("User requested cancellation...");
      abortControllerRef.current.abort();
    } else {
      // Navigate back to the appropriate page based on parser type
      if (parser === 'AIParser') {
        navigate(`/aiparser-config?file_id=${fileId}`);
      } else {
        navigate(`/structure-preview?file_id=${fileId}&parser=${parser}`);
      }
    }
  };

  const handleViewResults = () => {
    navigate(`/preview/${fileId}`);
  };

  return (
    <div className="h-screen bg-black text-grey-100 flex flex-col overflow-hidden">
      
      {/* Top Navigation */}
      <div className="w-full bg-black border-b border-grey-800 flex-shrink-0">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Left Navigation */}
            <div className="flex items-center space-x-6">
              <button
                onClick={() => {
                  if (!loading) {
                    if (parser === 'AIParser') {
                      navigate(`/aiparser-config?file_id=${fileId}`);
                    } else {
                      navigate(`/structure-preview?file_id=${fileId}&parser=${parser}`);
                    }
                  }
                }}
                disabled={loading}
                className={`text-xs font-mono transition-colors duration-200 ${
                  loading 
                    ? 'text-grey-600' 
                    : 'text-grey-500 hover:text-grey-300'
                }`}
              >
                ← Back
              </button>
              <span className="text-xs font-mono text-grey-400">Parse Execution</span>
            </div>
            
            {/* Right Navigation - Status Info */}
            <div className="flex items-center space-x-4">
              {originalFilename && (
                <span className="text-xs font-mono text-grey-500">{originalFilename}</span>
              )}
              {parser && (
                <span className="text-xs font-mono text-blue-400">Parser: {parser}</span>
              )}
              {loading && (
                <span className="text-xs font-mono text-green-400">● Processing...</span>
              )}
              {success && (
                <span className="text-xs font-mono text-green-400">✓ Completed</span>
              )}
              {error && (
                <span className="text-xs font-mono text-red-400">✗ Failed</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        <div className="w-full max-w-5xl">
          {/* Terminal Window */}
          <div className="bg-black border border-grey-700 shadow-2xl">
            {/* Terminal Title Bar */}
            <div className="bg-grey-800 border-b border-grey-700 px-4 py-2 flex items-center">
              <div className="flex space-x-2">
                <button 
                  onClick={handleCancel}
                  className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-400 cursor-pointer transition-colors duration-150"
                  title={loading ? "Cancel parsing" : "Close terminal and return"}
                ></button>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex-1 text-center">
                <span className="text-grey-300 text-sm font-mono">PDF2Data Parser Terminal</span>
              </div>
            </div>
            
            {/* Terminal Content */}
            <div 
              ref={terminalRef}
              className="p-4 h-96 overflow-y-auto bg-black font-mono text-sm text-green-400"
              style={{ 
                background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(5,5,5,0.95) 100%)',
                scrollbarWidth: 'thin',
                scrollbarColor: '#333 transparent'
              }}
            >
              {logs.map((log, index) => (
                <div key={index} className="mb-1 leading-relaxed">
                  {log.startsWith('pdf2data@parser:~$') ? (
                    <span className="text-white">
                      <span className="text-green-400">pdf2data@parser</span>
                      <span className="text-white">:</span>
                      <span className="text-blue-400">~</span>
                      <span className="text-white">$ </span>
                      <span className="text-yellow-300">{log.split('$ ')[1]}</span>
                    </span>
                  ) : log.includes('✓') ? (
                    <span className="text-green-300">{log}</span>
                  ) : log.includes('✗') || log.includes('ERROR') ? (
                    <span className="text-red-400">{log}</span>
                  ) : log.includes('⚠') ? (
                    <span className="text-yellow-300">{log}</span>
                  ) : (
                    <span className="text-grey-300">{log}</span>
                  )}
                </div>
              ))}
              
              {/* Active prompt with cursor */}
              {loading && (
                <div className="mb-1 leading-relaxed">
                  <span className="text-green-400">pdf2data@parser</span>
                  <span className="text-white">:</span>
                  <span className="text-blue-400">~</span>
                  <span className="text-white">$ </span>
                  <span className={`text-white ${showCursor ? 'opacity-100' : 'opacity-0'}`}>▋</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}