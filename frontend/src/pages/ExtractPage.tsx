import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { commonStyles } from "../theme";
import { API_ENDPOINTS } from "../config/api";

export default function ExtractPage() {
  const [mode, setMode] = useState("digital");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showCursor, setShowCursor] = useState(true);
  const [originalFilename, setOriginalFilename] = useState<string>("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const terminalRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isResetRef = useRef<boolean>(false);

  const fileId = searchParams.get("file_id");

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

  // Clean up EventSource and AbortController on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const addLog = (message: string, isCommand: boolean = false) => {
    // Don't add logs if terminal has been reset
    if (isResetRef.current) return;
    
    const timestamp = new Date().toLocaleString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    if (isCommand) {
      setLogs(prev => [...prev, `pdf2data@extraction:~$ ${message}`]);
    } else {
      setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    }
  };

  const resetTerminal = () => {
    // Set reset flag to prevent further logging
    isResetRef.current = true;
    
    // Abort any ongoing fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Close any active EventSource connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Reset all state
    setLoading(false);
    setLogs([]);
    setError(null);
  };

  const handleExtract = async () => {
    if (!fileId || loading) return;

    // Reset the flag to allow logging
    isResetRef.current = false;
    
    setLoading(true);
    setError(null);
    setLogs([]);

    // Initialize terminal
    addLog("PDF2Data Extraction Terminal v1.0.0");
    addLog("Connecting to extraction service...");
    
    // Create the extraction command
    const command = `extract --mode=${mode} --file=${fileId}`;
    addLog(command, true);

    try {
      // Create AbortController for this request
      abortControllerRef.current = new AbortController();
      
      // Create FormData for the streaming request
      const formData = new FormData();
      formData.append("file_id", fileId);
      formData.append("mode", mode);

      // Use fetch to start the streaming extraction
      const response = await fetch(API_ENDPOINTS.extractStream, {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = ''; // Buffer for incomplete lines

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Split by newlines and process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonString = line.slice(6).trim();
                if (!jsonString) continue; // Skip empty lines
                
                // Validate JSON before parsing
                if (!jsonString.startsWith('{') || !jsonString.endsWith('}')) {
                  console.warn('Skipping malformed JSON line:', jsonString.substring(0, 100) + '...');
                  continue;
                }
                
                const data = JSON.parse(jsonString);
                
                if (data.type === 'log') {
                  addLog(data.message);
                } else if (data.type === 'success') {
                  addLog(`✓ Extraction completed successfully!`);
                  addLog(`✓ Processed ${data.data.num_pages || 'unknown'} pages`);
                  addLog(`✓ Method used: ${data.data.method || mode}`);
                  addLog(`✓ Total characters: ${data.data.num_chars || 'unknown'}`);
                  addLog("✓ Ready for parsing stage");
                  
                  // Show redirect command
                  setTimeout(() => {
                    addLog("cd ../parse && ./start_parser.sh", true);
                    addLog("Redirecting to parser...");
                    
                    setTimeout(() => {
                      navigate(`/parse?file_id=${fileId}`);
                    }, 1000);
                  }, 500);
                  
                } else if (data.type === 'error') {
                  addLog(`✗ ERROR: ${data.message}`);
                  addLog("✗ Process terminated with exit code 1");
                  setError("Extraction failed. Please try again.");
                }
              } catch (e) {
                const errorMsg = line.length > 200 ? line.substring(0, 200) + '...' : line;
                console.error('Error parsing SSE data:', e, 'Raw line length:', line.length, 'Sample:', errorMsg);
                addLog(`⚠ Warning: Received malformed data (${line.length} chars), continuing...`);
                // Don't break the loop, just skip malformed lines
              }
            }
          }
        }
        
        // Process any remaining data in buffer
        if (buffer.trim()) {
          console.warn('Incomplete data in buffer:', buffer.substring(0, 100) + '...');
        }
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        addLog("✗ Extraction cancelled by user");
        addLog("✗ Process terminated");
      } else {
        addLog("✗ ERROR: Connection to extraction service failed");
        addLog("✗ Process terminated with exit code 1");
        setError("Extraction failed. Please try again.");
        console.error(err);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const extractionModes = [
    {
      id: "digital",
      name: "Digital Extraction",
      description: "Extract text directly from digital PDF content",
      features: ["Fastest method", "Best quality", "Preserves formatting"],
      recommended: true
    },
    {
      id: "ocr",
      name: "OCR (Optical Character Recognition)",
      description: "Extract text from scanned PDF images using AI",
      features: ["Works with scans", "Handwriting support", "Image-based PDFs"],
      recommended: false
    },
    {
      id: "auto",
      name: "Auto-Detect",
      description: "Automatically choose the best extraction method",
      features: ["Smart detection", "Fallback to OCR", "Best of both worlds"],
      recommended: false
    }
  ];

  return (
    <div className="h-screen bg-black text-grey-100 flex flex-col overflow-hidden">
      
      {/* Top Navigation */}
      <div className="w-full bg-black border-b border-grey-800 flex-shrink-0">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Left Navigation */}
            <div className="flex items-center space-x-6">
              <button
                onClick={() => !loading && navigate('/')}
                disabled={loading}
                className={`text-xs font-mono transition-colors duration-200 ${
                  loading 
                    ? 'text-grey-600' 
                    : 'text-grey-500 hover:text-grey-300'
                }`}
              >
                ← Back
              </button>
              <span className="text-xs font-mono text-grey-400">Text Extraction</span>
            </div>
            
            {/* Right Navigation - File Info & Status */}
            <div className="flex items-center space-x-4">
              {originalFilename && (
                <span className="text-xs font-mono text-grey-500">{originalFilename}</span>
              )}
              {mode && !loading && logs.length === 0 && (
                <span className="text-xs font-mono text-blue-400">Mode: {mode}</span>
              )}
              {loading && (
                <span className="text-xs font-mono text-green-400">● Extracting...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-6xl">
        {!loading && logs.length === 0 ? (
          // Extraction Method Selection Phase
          <div className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center">
              {extractionModes.map((extractionMode) => (
                <div key={extractionMode.id} className="relative w-full max-w-sm">
                  <label className="cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      value={extractionMode.id}
                      checked={mode === extractionMode.id}
                      onChange={() => !loading && setMode(extractionMode.id)}
                      disabled={loading}
                      className="sr-only"
                    />
                    <div className={`p-6 border transition-all duration-200 h-96 flex flex-col ${
                      loading 
                        ? 'opacity-50 border-grey-800'
                        : mode === extractionMode.id
                        ? 'border-grey-600 bg-grey-900 bg-opacity-30'
                        : 'border-grey-800 hover:border-grey-700 hover:bg-grey-900 hover:bg-opacity-20'
                    }`}>
                      {/* Recommended Badge */}
                      {extractionMode.recommended && (
                        <div className="absolute -top-2 -right-2">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-grey-800 text-grey-300 border border-grey-700 shiny-text">
                            Recommended
                          </span>
                        </div>
                      )}

                      {/* Title and Description */}
                      <div className="text-center mb-6">
                        <div className="w-12 h-12 mx-auto bg-grey-800 border border-grey-700 flex items-center justify-center mb-3">
                          <span className="text-grey-300 text-xs font-mono shiny-text">
                            {extractionMode.id === 'digital' ? 'DIG' : 
                             extractionMode.id === 'ocr' ? 'OCR' : 'AUTO'}
                          </span>
                        </div>
                        <h4 className="font-semibold text-grey-100 shiny-text-strong">{extractionMode.name}</h4>
                        <p className="text-sm text-grey-400 mt-2 shiny-text">{extractionMode.description}</p>
                      </div>

                      {/* Features */}
                      <ul className="space-y-2 mb-6 flex-grow">
                        {extractionMode.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-sm text-grey-300 shiny-text">
                            <span className="text-grey-500 mr-2">•</span>
                            {feature}
                          </li>
                        ))}
                      </ul>

                      {/* Selection Indicator */}
                      <div className="text-center mt-auto">
                        <div className={`w-4 h-4 rounded-full mx-auto border-2 transition-colors ${
                          mode === extractionMode.id
                            ? 'bg-grey-600 border-grey-600'
                            : 'border-grey-700'
                        }`}>
                          {mode === extractionMode.id && (
                            <div className="w-2 h-2 bg-grey-200 rounded-full m-0.5"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </div>

            {/* Action Button */}
            <div className="mt-12 text-center">
              <button
                onClick={handleExtract}
                disabled={loading || !mode}
                className={`text-lg py-4 px-8 transition-all duration-200 shiny-text-strong ${
                  loading || !mode
                    ? 'text-grey-500 opacity-50'
                    : 'text-grey-200 hover:bg-white hover:text-black cursor-pointer'
                }`}
              >
                {loading ? "Extracting..." : "Start Text Extraction"}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-grey-900 border border-grey-700 text-grey-300 shiny-text text-center max-w-2xl mx-auto">
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          // Terminal Processing Phase
          <div className="max-w-5xl mx-auto">
            {/* Terminal Window */}
            <div className="bg-black border border-grey-700 shadow-2xl">
              {/* Terminal Title Bar */}
              <div className="bg-grey-800 border-b border-grey-700 px-4 py-2 flex items-center">
                <div className="flex space-x-2">
                  <button 
                    onClick={resetTerminal}
                    className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-400 cursor-pointer transition-colors duration-150"
                    title="Close terminal and return to mode selection"
                  ></button>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="flex-1 text-center">
                  <span className="text-grey-300 text-sm font-mono">PDF2Data Extraction Terminal</span>
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
                    {log.startsWith('pdf2data@extraction:~$') ? (
                      <span className="text-white">
                        <span className="text-green-400">pdf2data@extraction</span>
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
                    <span className="text-green-400">pdf2data@extraction</span>
                    <span className="text-white">:</span>
                    <span className="text-blue-400">~</span>
                    <span className="text-white">$ </span>
                    <span className={`text-white ${showCursor ? 'opacity-100' : 'opacity-0'}`}>▋</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
