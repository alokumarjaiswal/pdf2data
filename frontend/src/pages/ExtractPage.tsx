import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { commonStyles } from "../theme";

export default function ExtractPage() {
  const [mode, setMode] = useState("digital");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showCursor, setShowCursor] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const terminalRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fileId = searchParams.get("file_id");

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

  // Clean up EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const addLog = (message: string, isCommand: boolean = false) => {
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

  const handleExtract = async () => {
    if (!fileId) return;

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
      // Create FormData for the streaming request
      const formData = new FormData();
      formData.append("file_id", fileId);
      formData.append("mode", mode);

      // Use fetch to start the streaming extraction
      const response = await fetch("http://127.0.0.1:8000/extract/stream", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
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
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }

    } catch (err) {
      addLog("✗ ERROR: Connection to extraction service failed");
      addLog("✗ Process terminated with exit code 1");
      setError("Extraction failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-black text-grey-100 flex items-center justify-center p-6">
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
                      onChange={() => setMode(extractionMode.id)}
                      className="sr-only"
                    />
                    <div className={`p-6 border transition-all duration-200 h-96 flex flex-col ${
                      mode === extractionMode.id
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
                disabled={loading}
                className="text-lg py-4 px-8 text-grey-200 hover:bg-white hover:text-black transition-all duration-200 shiny-text-strong"
              >
                Start Text Extraction
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
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
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
  );
}
