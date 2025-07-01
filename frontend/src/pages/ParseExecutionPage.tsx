import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { commonStyles } from "../theme";

export default function ParseExecutionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileId = searchParams.get("file_id");
  const parser = searchParams.get("parser");

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const executeParsing = async () => {
    if (!fileId || !parser) {
      setError("Missing required parameters");
      setLoading(false);
      return;
    }

    setError(null);
    addLog("🚀 Starting parsing process...");
    addLog(`Parser: ${parser}`);
    addLog("Looking for extracted text file...");
    addLog("Preparing data for parsing...");

    const formData = new FormData();
    formData.append("file_id", fileId);
    formData.append("parser", parser);

    try {
      addLog("📤 Sending parsing request to server...");
      
      const res = await fetch("http://127.0.0.1:8000/parse", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const result = await res.json();
      
      addLog("✅ Parsing completed successfully!");
      addLog(`Parser used: ${result.parser_used}`);
      addLog(`Extraction method: ${result.extraction_mode_used?.toUpperCase()}`);
      addLog("📊 Data saved to database");
      addLog(`Output file: ${result.saved_as}`);
      addLog("🎉 Process completed!");

      setSuccess(true);
      setLoading(false);

      // Auto-navigate to preview after a short delay
      setTimeout(() => {
        navigate(`/preview/${fileId}`);
      }, 2000);

    } catch (err) {
      addLog("❌ Parsing failed!");
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

  const getStatusInfo = () => {
    if (loading) {
      return {
        title: "Processing Your Document",
        subtitle: "Please wait while we analyze and extract data from your PDF",
        icon: "🔄"
      };
    } else if (success) {
      return {
        title: "Parsing Complete!",
        subtitle: "Your PDF has been successfully processed and data extracted",
        icon: "✅"
      };
    } else {
      return {
        title: "Parsing Failed",
        subtitle: "There was an issue processing your document",
        icon: "❌"
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Layout 
      title={statusInfo.title}
      subtitle={statusInfo.subtitle}
    >
      <div className="max-w-4xl mx-auto">
        {/* Status Card */}
        <div className={`${commonStyles.card} mb-8`}>
          <div className="text-center">
            <div className="text-6xl mb-4">{statusInfo.icon}</div>
            <h3 className={`${commonStyles.heading.h3} mb-2`}>{statusInfo.title}</h3>
            <p className="text-gray-600 text-lg">{statusInfo.subtitle}</p>
          </div>

          {/* Progress Indicator */}
          {loading && (
            <div className="mt-6">
              <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
                <div className="flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-blue-800 font-medium">Processing in progress...</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-6">
              <div className={commonStyles.alert.success}>
                <div className="flex items-center">
                  <div className="text-green-600 text-xl mr-3">🎉</div>
                  <div>
                    <h4 className="text-green-800 font-medium">Success!</h4>
                    <p className="text-green-700 text-sm">
                      Redirecting to preview in a moment...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6">
              <div className={commonStyles.alert.error}>
                <div className="flex items-center">
                  <div className="text-red-600 text-xl mr-3">⚠️</div>
                  <div>
                    <h4 className="text-red-800 font-medium">Parsing Failed</h4>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logs Section */}
        <div className={commonStyles.card}>
          <h3 className={`${commonStyles.heading.h4} mb-4 flex items-center`}>
            <span className="mr-2">📋</span>
            Processing Logs
          </h3>
          
          <div className="bg-gray-900 text-green-400 p-6 rounded-xl font-mono text-sm max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="mb-2 leading-relaxed">
                {log}
              </div>
            ))}
            {loading && (
              <div className="flex items-center animate-pulse">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-bounce"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <span className="ml-2">Processing...</span>
              </div>
            )}
          </div>

          {/* Progress Summary */}
          {loading && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Processing steps completed:</span>
                <span className="font-medium">{logs.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Estimated time remaining:</span>
                <span className="font-medium">~30 seconds</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            {success && (
              <button
                onClick={handleViewResults}
                className={`${commonStyles.button.success} flex-1 text-lg py-4`}
              >
                <span className="mr-2">👀</span>
                View Results
              </button>
            )}
            {error && (
              <button
                onClick={() => navigate(-1)}
                className={`${commonStyles.button.secondary} flex-1 sm:flex-none`}
              >
                <span className="mr-2">←</span>
                Go Back
              </button>
            )}
            <button
              onClick={handleStartOver}
              className={`${commonStyles.button.secondary} flex-1 sm:flex-none`}
            >
              <span className="mr-2">🔄</span>
              Start Over
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
} 