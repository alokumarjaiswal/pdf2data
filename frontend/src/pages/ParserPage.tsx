import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../config/api";

const parserOptions = [
  { 
    label: "DaybookParser",
    value: "DaybookParser",
    filename: "daybook.py",
    status: "active"
  },
  { 
    label: "AIParser",
    value: "AIParser",
    filename: "aiparser.py",
    status: "active"
  },
  { 
    label: "InvoiceParser",
    value: "InvoiceParser", 
    filename: "invoice.py",
    status: "development"
  },
  { 
    label: "ReceiptParser",
    value: "ReceiptParser",
    filename: "receipt.py", 
    status: "development"
  }
];

export default function ParserPage() {
  const [searchParams] = useSearchParams();
  const [parser, setParser] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [originalFilename, setOriginalFilename] = useState<string>("");
  const navigate = useNavigate();

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

  const handleSelectParser = () => {
    setError("");
    
    if (!fileId) {
      setError("No file ID provided. Please start from the upload page.");
      return;
    }
    
    if (!parser) {
      setError("Please select a parser first.");
      return;
    }

    const selectedOption = parserOptions.find(p => p.value === parser);
    if (!selectedOption) {
      setError("Invalid parser selected.");
      return;
    }

    if (selectedOption.status !== 'active') {
      setError(`${selectedOption.label} is currently in development and not available.`);
      return;
    }

    try {
      // Special handling for AIParser - go to config page first
      if (parser === 'AIParser') {
        navigate(`/aiparser-config?file_id=${fileId}`);
      } else {
        // Navigate to structure preview page for other parsers
    navigate(`/structure-preview?file_id=${fileId}&parser=${parser}`);
      }
    } catch (err) {
      setError("Navigation error. Please try again.");
      console.error("Navigation error:", err);
    }
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
                onClick={() => navigate(`/extract?file_id=${fileId}`)}
                className="text-xs font-mono text-grey-500 hover:text-grey-300 transition-colors duration-200"
              >
                ← Back
              </button>
              <span className="text-xs font-mono text-grey-400">Parser Selection</span>
            </div>
            
            {/* Right Navigation - File Info */}
            <div className="flex items-center space-x-4">
              {originalFilename && (
                <span className="text-xs font-mono text-grey-500">{originalFilename}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
        {/* File List */}
        <div className="max-h-80 overflow-y-auto space-y-1 mb-12 custom-scrollbar">
          {parserOptions.map((option) => (
            <div 
              key={option.value}
              onClick={() => setParser(option.value)}
              className={`flex items-center space-x-3 py-3 px-3 cursor-pointer transition-all duration-200 ${
                parser === option.value
                  ? 'bg-white text-black'
                  : 'hover:bg-grey-900 hover:bg-opacity-30'
              }`}
            >
              <span className={`text-xs font-mono ${
                parser === option.value ? 'text-black' : 'text-grey-500 shiny-text'
              }`}>
                py
              </span>
              <span className={`font-mono ${
                parser === option.value ? 'text-black font-medium' : 'text-grey-300 shiny-text'
              }`}>
                {option.filename}
              </span>
              {option.value === 'AIParser' && (
                <span 
                  className={`ml-2 text-xs font-mono px-2 py-1 rounded-full font-bold tracking-wider ${
                    parser === option.value 
                      ? 'bg-black bg-opacity-10 text-black' 
                      : 'bg-sky-900 bg-opacity-50 text-sky-300'
                  }`}>
                  AI
                </span>
              )}
              {option.status === 'development' && (
                <span className={`text-xs font-mono ${
                  parser === option.value ? 'text-black opacity-60' : 'text-grey-600'
                }`}>
                  dev
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 bg-opacity-20 border border-red-800 rounded text-center">
            <p className="text-red-400 font-mono text-sm">⚠️ {error}</p>
            {error.includes("file ID") && (
              <button
                onClick={() => navigate('/')}
                className="mt-2 text-red-300 hover:text-red-200 underline font-mono text-xs"
              >
                Go to Upload Page
              </button>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={handleSelectParser}
            disabled={!parser || parserOptions.find(p => p.value === parser)?.status !== 'active'}
            className="py-3 px-6 text-grey-200 hover:bg-white hover:text-black transition-all duration-200 font-mono shiny-text disabled:opacity-50"
          >
            {!parser ? 
              'Select Parser' :
              parserOptions.find(p => p.value === parser)?.status === 'active' ? 
              (parser === 'AIParser' ? 'Configure AI Parser' : 'Go') : 
              'In Development'
            }
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
