import { PreviewComponentProps, BaseParsedData } from './PreviewRegistry';

interface AIEntity {
  type: string;
  value: string;
  context: string;
}

interface AIParserSpecificData {
  parser_type: string;
  success: boolean;
  data: any;
  extracted_entities: AIEntity[];
  summary: string;
  confidence: number;
  error?: string;
}

interface AIParserData extends BaseParsedData {
  tables: AIParserSpecificData[];
}

// Utility function to get a color for entity types
const getEntityTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'person': 'text-blue-400',
    'organization': 'text-green-400',
    'amount': 'text-yellow-400',
    'date': 'text-purple-400',
    'location': 'text-pink-400',
    'phone': 'text-cyan-400',
    'email': 'text-orange-400',
  };
  return colors[type.toLowerCase()] || 'text-grey-400';
};

// Utility function to get confidence color
const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-green-400';
  if (confidence >= 0.6) return 'text-yellow-400';
  return 'text-red-400';
};

// Utility function to format confidence as percentage
const formatConfidence = (confidence: number): string => {
  return `${Math.round(confidence * 100)}%`;
};

export default function AIParserPreview({ data, originalFilename, fileId }: PreviewComponentProps) {
  // Extract AI parser-specific data
  const aiParserData = data as unknown as AIParserData;
  const tables = aiParserData.tables || [];

  return (
    <div className="space-y-8">
      {tables && tables.length > 0 ? (
        tables.map((result, index) => (
          <div key={index} className="border-b border-grey-800 pb-8 last:border-b-0">
            {/* Header with Success/Error Status */}
            <div className="border-b border-grey-700 pb-3 mb-6">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-medium text-grey-100 shiny-text">
                  🧠 AI Parsing Results
                </h3>
                <div className="flex items-center space-x-4">
                  {result.success ? (
                    <span className="text-green-400 text-xs font-mono">✅ Success</span>
                  ) : (
                    <span className="text-red-400 text-xs font-mono">❌ Failed</span>
                  )}
                  {result.confidence !== undefined && (
                    <span className={`text-xs font-mono ${getConfidenceColor(result.confidence)}`}>
                      🎯 {formatConfidence(result.confidence)} confidence
                    </span>
                  )}
                </div>
              </div>
            </div>

            {result.success ? (
              <>
                {/* Summary Section */}
                {result.summary && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-grey-300 mb-3 shiny-text">
                      📝 Document Summary
                    </h4>
                    <div className="bg-grey-900 border border-grey-800 p-4 rounded">
                      <p className="text-grey-200 font-mono text-sm leading-relaxed">
                        {result.summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* Extracted Entities */}
                {result.extracted_entities && result.extracted_entities.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-grey-300 mb-3 shiny-text">
                      🔍 Extracted Entities ({result.extracted_entities.length})
                    </h4>
                    <div className="space-y-3">
                      {result.extracted_entities.map((entity, entityIndex) => (
                        <div 
                          key={entityIndex} 
                          className="bg-grey-900 border border-grey-800 p-4 rounded"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <span className={`text-xs font-mono px-2 py-1 rounded bg-grey-800 ${getEntityTypeColor(entity.type)}`}>
                                {entity.type.toUpperCase()}
                              </span>
                              <span className="text-grey-100 font-mono text-sm font-medium">
                                {entity.value}
                              </span>
                            </div>
                          </div>
                          {entity.context && (
                            <p className="text-grey-400 text-xs font-mono leading-relaxed">
                              Context: "{entity.context}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw AI Data */}
                {result.data && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-grey-300 mb-3 shiny-text">
                      🤖 Raw AI Response
                    </h4>
                    <div className="bg-black border border-grey-800 p-4 rounded">
                      <pre className="text-grey-300 font-mono text-xs overflow-x-auto custom-scrollbar whitespace-pre-wrap">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Error Display */
              <div className="bg-red-900 bg-opacity-20 border border-red-800 p-4 rounded">
                <h4 className="text-red-400 font-medium mb-2">❌ Parsing Failed</h4>
                <p className="text-red-300 font-mono text-sm">
                  {result.error || "An unknown error occurred during AI parsing."}
                </p>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="py-12 text-center">
          <p className="text-grey-400 font-mono mb-1 text-sm">No AI parsing results found</p>
          <p className="text-grey-500 text-xs font-mono">
            This could be due to parsing errors or an issue with the OpenAI API key.
          </p>
        </div>
      )}
    </div>
  );
} 