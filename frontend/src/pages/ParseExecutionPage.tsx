import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

export default function ParseExecutionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);

  const fileId = searchParams.get("file_id");
  const parser = searchParams.get("parser");

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

    try {
      addLog("Sending parsing request to server...");
      
      const res = await fetch("http://127.0.0.1:8000/parse", {
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
      setError("Parsing failed. Please try again or select a different parser.");
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
    <div className="min-h-screen bg-black text-grey-100 flex items-center justify-center p-6">
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

        {/* Action Buttons - Only show on error */}
        {error && (
          <div className="flex justify-center gap-4 mt-8">
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
        )}
      </div>
    </div>
  );
} 