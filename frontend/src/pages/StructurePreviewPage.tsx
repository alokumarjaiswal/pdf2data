import { useSearchParams, useNavigate } from "react-router-dom";

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
  
  const fileId = searchParams.get("file_id");
  const parser = searchParams.get("parser");
  const structure = parser ? parserStructures[parser as keyof typeof parserStructures] : null;

  const handleExecuteParser = () => {
    if (!fileId || !parser) return;
    navigate(`/parse-execution?file_id=${fileId}&parser=${parser}`);
  };

  const handleGoBack = () => {
    navigate(`/parse?file_id=${fileId}`);
  };

  if (!structure) {
    return (
      <div className="min-h-screen bg-black text-grey-100 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl text-center">
          <div className="p-6 bg-grey-900 border border-grey-800">
            <p className="text-grey-400 font-mono shiny-text">Unknown parser type "{parser}"</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-grey-100 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="bg-black border border-grey-800 p-6 mb-8">
          <pre className="text-sm text-grey-300 overflow-x-auto leading-relaxed font-mono custom-scrollbar">
            {JSON.stringify(structure.expectedFields, null, 2)}
          </pre>
        </div>
        
        <div className="flex justify-center gap-4">
          <button
            onClick={handleGoBack}
            className="py-3 px-6 text-grey-200 hover:bg-white hover:text-black transition-all duration-200 font-mono shiny-text"
          >
            ←
          </button>
          <button
            onClick={handleExecuteParser}
            className="py-3 px-6 text-grey-200 hover:bg-white hover:text-black transition-all duration-200 font-mono shiny-text"
          >
            Execute Parser
          </button>
        </div>
      </div>
    </div>
  );
} 