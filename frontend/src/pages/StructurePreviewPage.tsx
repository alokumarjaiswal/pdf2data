import { useSearchParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import Layout from "../components/Layout";
import { commonStyles } from "../theme";

// Define expected structures for each parser
const parserStructures = {
  "DaybookParser": {
    name: "Daybook Parser",
    description: "Extracts structured data from agricultural society daybooks",
    expectedFields: {
      "society_name": "Name of the agricultural society",
      "village_name": "Village location",
      "date": "Date of the daybook entry", 
      "entries": [
        {
          "account_name": "Name of account holder",
          "account_number": "Account number (if available)",
          "amount": "Transaction amount",
          "total_amount": "Running total"
        }
      ],
      "totals": {
        "grand_total_credit": "Total credit amount",
        "grand_total_debit": "Total debit amount",
        "cash_in_hand": "Cash balance"
      },
      "amount_in_words": "Amount written in words (Indian format)"
    },
    sampleOutput: {
      "society_name": "The Rajewal Bhumiantavi Cooperative Agricultural Society Ltd.",
      "village_name": "Rajewal",
      "date": "15-03-2024",
      "entries": [
        {
          "account_name": "HARINDER SINGH S/O KEHAR SINGH",
          "account_number": "166",
          "amount": 50000.00,
          "total_amount": 50000.00
        }
      ],
      "totals": {
        "grand_total_credit": 125000.00,
        "grand_total_debit": 125000.00
      },
      "amount_in_words": "One Lakh Twenty Five Thousand Rupees Only"
    }
  }
  // Add more parser structures here as needed
};

export default function StructurePreviewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);

  const fileId = searchParams.get("file_id");
  const parser = searchParams.get("parser");

  const structure = parser ? parserStructures[parser as keyof typeof parserStructures] : null;

  const handleConfirmParsing = () => {
    if (!fileId || !parser) return;
    
    // Navigate to parsing execution page
    navigate(`/parse-execution?file_id=${fileId}&parser=${parser}`);
  };

  const handleGoBack = () => {
    navigate(`/parse?file_id=${fileId}`);
  };

  if (!structure) {
    return (
      <Layout title="Parser Error" subtitle="Unable to load parser information">
        <div className="max-w-2xl mx-auto">
          <div className={commonStyles.alert.error}>
            <div className="flex items-center">
              <span className="text-red-600 mr-2">⚠️</span>
              <div>
                <strong>Error:</strong> Unknown parser type "{parser}"
                <p className="text-sm mt-1">Please go back and select a valid parser.</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Data Structure Preview"
      subtitle={`Review the expected data structure for ${structure.name}`}
    >
      <div className="max-w-5xl mx-auto">
        {/* Parser Information Card */}
        <div className={`${commonStyles.card} mb-8`}>
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xl">📊</span>
            </div>
            <div className="flex-1">
              <h3 className={`${commonStyles.heading.h3} mb-2`}>{structure.name}</h3>
              <p className="text-gray-600 text-lg">{structure.description}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Expected Fields */}
          <div className={commonStyles.card}>
            <h3 className={`${commonStyles.heading.h4} mb-4 flex items-center`}>
              <span className="mr-2">🏗️</span>
              Data Structure
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="mb-2">
                <span className={commonStyles.badge.primary}>Field Definitions</span>
              </div>
              <pre className="text-sm text-gray-800 overflow-x-auto leading-relaxed">
                {JSON.stringify(structure.expectedFields, null, 2)}
              </pre>
            </div>
          </div>

          {/* Sample Output */}
          <div className={commonStyles.card}>
            <h3 className={`${commonStyles.heading.h4} mb-4 flex items-center`}>
              <span className="mr-2">✨</span>
              Sample Output
            </h3>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="mb-2">
                <span className={commonStyles.badge.success}>Example Result</span>
              </div>
              <p className="text-green-800 text-sm mb-3">
                This is an example of what your parsed data will look like:
              </p>
              <div className="bg-white rounded border p-3">
                <pre className="text-sm text-gray-800 overflow-x-auto leading-relaxed">
                  {JSON.stringify(structure.sampleOutput, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Section */}
        <div className={`${commonStyles.card} mt-8`}>
          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600">⚠️</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-800 mb-3">Confirmation Required</h4>
                <div className="flex items-start space-x-3 mb-4">
                  <input
                    type="checkbox"
                    id="confirm"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="confirm" className="text-yellow-800 font-medium leading-relaxed">
                    I understand the data structure and want to proceed with parsing
                  </label>
                </div>
                <p className="text-yellow-700 text-sm leading-relaxed">
                  The parsing process will attempt to extract data matching this structure from your PDF.
                  Results may vary based on the document's format and quality.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button
              onClick={handleGoBack}
              className={`${commonStyles.button.secondary} flex-1 sm:flex-none`}
            >
              <span className="mr-2">←</span>
              Go Back
            </button>
            <button
              onClick={handleConfirmParsing}
              disabled={!confirmed}
              className={`${commonStyles.button.primary} flex-1 text-lg py-4`}
            >
              <span className="mr-2">🚀</span>
              Confirm & Start Parsing
            </button>
          </div>
        </div>

        {/* Information Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6">
            <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <span className="text-blue-600 text-xl">🎯</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Accurate Extraction</h4>
            <p className="text-sm text-gray-600">Our specialized parsers are designed to extract data with high accuracy</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
              <span className="text-green-600 text-xl">📊</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Structured Output</h4>
            <p className="text-sm text-gray-600">Data is organized in a consistent, easy-to-use JSON format</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-3">
              <span className="text-purple-600 text-xl">🔧</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Customizable</h4>
            <p className="text-sm text-gray-600">Parser configurations can be adjusted for specific document needs</p>
          </div>
        </div>
      </div>
    </Layout>
  );
} 