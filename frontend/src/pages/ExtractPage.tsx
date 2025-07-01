import { useSearchParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import Layout from "../components/Layout";
import { commonStyles } from "../theme";

export default function ExtractPage() {
  const [mode, setMode] = useState("digital");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const fileId = searchParams.get("file_id");

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleExtract = async () => {
    if (!fileId) return;

    setLoading(true);
    setError(null);
    setLogs([]);

    addLog("Starting extraction process...");
    addLog(`Selected extraction mode: ${mode.toUpperCase()}`);

    const formData = new FormData();
    formData.append("file_id", fileId);
    formData.append("mode", mode);

    try {
      addLog("Sending request to server...");
      
      const res = await fetch("http://127.0.0.1:8000/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Extraction failed");

      const result = await res.json();
      addLog("Extraction completed successfully!");
      addLog(`Extracted ${result.num_pages || 'unknown'} pages`);
      addLog(`Method used: ${result.method || mode}`);
      
      // Small delay to show completion
      setTimeout(() => {
        navigate(`/parse?file_id=${fileId}`);
      }, 1000);

    } catch (err) {
      addLog("❌ Extraction failed!");
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
      icon: "💻",
      description: "Extract text directly from digital PDF content",
      features: ["Fastest method", "Best quality", "Preserves formatting"],
      recommended: true
    },
    {
      id: "ocr",
      name: "OCR (Optical Character Recognition)",
      icon: "👁️",
      description: "Extract text from scanned PDF images using AI",
      features: ["Works with scans", "Handwriting support", "Image-based PDFs"],
      recommended: false
    },
    {
      id: "auto",
      name: "Auto-Detect",
      icon: "🤖",
      description: "Automatically choose the best extraction method",
      features: ["Smart detection", "Fallback to OCR", "Best of both worlds"],
      recommended: false
    }
  ];

  return (
    <Layout 
      title="Choose Extraction Method"
      subtitle="Select how you'd like to extract text from your PDF document"
    >
      <div className="max-w-4xl mx-auto">
        {/* Extraction Mode Selection */}
        <div className={`${commonStyles.card} mb-8`}>
          <h3 className={`${commonStyles.heading.h3} mb-6`}>Extraction Methods</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {extractionModes.map((extractionMode) => (
              <div key={extractionMode.id} className="relative">
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value={extractionMode.id}
                    checked={mode === extractionMode.id}
                    onChange={() => setMode(extractionMode.id)}
                    className="sr-only"
                  />
                  <div className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                    mode === extractionMode.id
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                  }`}>
                    {/* Recommended Badge */}
                    {extractionMode.recommended && (
                      <div className="absolute -top-2 -right-2">
                        <span className={commonStyles.badge.success}>Recommended</span>
                      </div>
                    )}

                    {/* Icon and Title */}
                    <div className="text-center mb-4">
                      <div className="text-3xl mb-2">{extractionMode.icon}</div>
                      <h4 className="font-semibold text-gray-900">{extractionMode.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{extractionMode.description}</p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2">
                      {extractionMode.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <span className="text-green-500 mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* Selection Indicator */}
                    <div className={`mt-4 w-4 h-4 rounded-full mx-auto border-2 transition-colors ${
                      mode === extractionMode.id
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {mode === extractionMode.id && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                      )}
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="mt-8">
            <button
              onClick={handleExtract}
              disabled={loading}
              className={`w-full ${commonStyles.button.success} text-lg py-4`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Extracting Text...
                </div>
              ) : (
                <>
                  <span className="mr-2">🚀</span>
                  Start Text Extraction
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className={`mt-4 ${commonStyles.alert.error}`}>
              <div className="flex items-center">
                <span className="text-red-600 mr-2">⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Logs Section */}
        {logs.length > 0 && (
          <div className={commonStyles.card}>
            <h3 className={`${commonStyles.heading.h4} mb-4`}>
              🔍 Extraction Progress
            </h3>
            <div className="bg-gray-900 text-green-400 p-6 rounded-xl font-mono text-sm max-h-80 overflow-y-auto">
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

            {/* Progress Indicator */}
            {loading && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Extraction in progress...</span>
                  <span>{logs.length} steps completed</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
