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
  const terminalRef = useRef<HTMLDivElement>(null);

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
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
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

    } catch (err) {
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
      setLoading(false);
    }
  };

  // Start parsing when component mounts
  useEffect(() => {
    executeParsing();
  }, []);

  const handleViewResults = () => {
    navigate(`/preview/${fileId}`);
  };

  const handleStartOver = () => {
    navigate('/');
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
                onClick={() => navigate(-1)}
                className="text-xs font-mono text-grey-500 hover:text-grey-300 transition-colors duration-200"
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
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
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

      {/* Bottom Action Bar - Only show on error */}
      {error && (
        <div className="w-full bg-black flex-shrink-0">
          <div className="max-w-full mx-auto px-6 py-6">
            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="py-3 px-6 text-grey-200 hover:bg-white hover:text-black transition-all duration-200 font-mono shiny-text"
              >
                ← Go Back
              </button>
              <button
                onClick={handleStartOver}
                className="py-3 px-6 text-grey-200 hover:bg-white hover:text-black transition-all duration-200 font-mono shiny-text"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 