import { useSearchParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import Layout from "../components/Layout";
import { commonStyles } from "../theme";

const parserOptions = [
  { 
    label: "Daybook Parser", 
    value: "DaybookParser",
    icon: "📊",
    description: "Specialized for agricultural society daybooks and financial records",
    features: ["Account entries", "Transaction tracking", "Amount totals", "Indian number format"]
  },
  // Add more parsers here as they're developed
];

export default function ParserPage() {
  const [searchParams] = useSearchParams();
  const [parser, setParser] = useState("DaybookParser");
  const navigate = useNavigate();

  const fileId = searchParams.get("file_id");

  const handleSelectParser = () => {
    if (!fileId || !parser) return;

    // Navigate to structure preview page  
    navigate(`/structure-preview?file_id=${fileId}&parser=${parser}`);
  };

  return (
    <Layout 
      title="Select Document Parser"
      subtitle="Choose the appropriate parser for your document type to ensure accurate data extraction"
    >
      <div className="max-w-4xl mx-auto">
        <div className={commonStyles.card}>
          <h3 className={`${commonStyles.heading.h3} mb-6`}>Available Document Parsers</h3>
          
          <div className="space-y-4">
            {parserOptions.map((option) => (
              <label key={option.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="parser"
                  value={option.value}
                  checked={parser === option.value}
        onChange={(e) => setParser(e.target.value)}
                  className="sr-only"
                />
                <div className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  parser === option.value
                    ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-25'
                }`}>
                  <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xl">{option.icon}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{option.label}</h4>
                        <div className={`w-5 h-5 rounded-full border-2 transition-colors ${
                          parser === option.value
                            ? 'bg-indigo-500 border-indigo-500'
                            : 'border-gray-300'
                        }`}>
                          {parser === option.value && (
                            <div className="w-3 h-3 bg-white rounded-full m-0.5"></div>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-4">{option.description}</p>
                      
                      {/* Features */}
                      <div className="grid grid-cols-2 gap-2">
                        {option.features.map((feature, index) => (
                          <div key={index} className="flex items-center text-sm text-gray-600">
                            <span className="text-green-500 mr-2">✓</span>
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* Coming Soon Message */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-yellow-600 mr-2">🚀</span>
              <div>
                <h4 className="font-medium text-yellow-800">More parsers coming soon!</h4>
                <p className="text-sm text-yellow-700">We're continuously adding support for different document types.</p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-8">
      <button
              onClick={handleSelectParser}
              disabled={!parser}
              className={`w-full ${commonStyles.button.primary} text-lg py-4`}
            >
              <span className="mr-2">🔍</span>
              Preview Data Structure
      </button>
          </div>
        </div>

        {/* Information Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={commonStyles.card}>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-blue-600 text-xl">🎯</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Specialized Parsing</h4>
              <p className="text-sm text-gray-600">Each parser is trained for specific document types to ensure maximum accuracy and relevant data extraction.</p>
            </div>
          </div>
          
          <div className={commonStyles.card}>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-green-600 text-xl">📋</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Structure Preview</h4>
              <p className="text-sm text-gray-600">See exactly what data will be extracted before processing, so you know what to expect from the results.</p>
            </div>
          </div>
        </div>
    </div>
    </Layout>
  );
}
