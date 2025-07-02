import { useSearchParams, useNavigate } from "react-router-dom";
import { useState } from "react";

const parserOptions = [
  { 
    label: "DaybookParser",
    value: "DaybookParser",
    filename: "daybook.py",
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
  const navigate = useNavigate();

  const fileId = searchParams.get("file_id");

  const handleSelectParser = () => {
    if (!fileId || !parser) return;

    // Navigate to structure preview page  
    navigate(`/structure-preview?file_id=${fileId}&parser=${parser}`);
  };

  return (
    <div className="min-h-screen bg-black text-grey-100 flex items-center justify-center p-6">
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
              'Go' : 
              'In Development'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
