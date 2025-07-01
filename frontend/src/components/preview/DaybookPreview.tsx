import { PreviewComponentProps } from './PreviewRegistry';
import { commonStyles } from '../../theme';

// Utility function to safely format numbers
const formatAmount = (value: number | null | undefined): string => {
  if (value === null || value === undefined || typeof value !== 'number') {
    return "-";
  }
  return value.toFixed(2);
};

interface DaybookEntry {
  account_name: string;
  account_number?: string;
  amount?: number;
  total_amount?: number;
}

interface DaybookTable {
  society_name?: string;
  village_name?: string;
  date?: string;
  entries?: DaybookEntry[];
  totals?: Record<string, number>;
  amount_in_words?: string;
}

interface DaybookData {
  tables: DaybookTable[];
  [key: string]: any;
}

export default function DaybookPreview({ data, originalFilename, fileId }: PreviewComponentProps) {
  // Extract daybook-specific data from the parsed data
  const daybookData = data as DaybookData;
  const tables = daybookData.tables || [];
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header Card */}
        <div className={`${commonStyles.card} mb-8`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl">📊</span>
              </div>
              <div>
                <h1 className={`${commonStyles.heading.h2} mb-2`}>
                  Daybook Analysis Complete
                </h1>
                <p className="text-lg text-gray-600 mb-3">{originalFilename}</p>
                <div className="flex items-center gap-3">
                  <span className={commonStyles.badge.success}>
                    {data.parser}
                  </span>
                  <span className="text-sm text-gray-500">
                    ID: {fileId.substring(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`http://127.0.0.1:8000/api/data/${fileId}?pretty=1`}
                target="_blank"
                rel="noopener noreferrer"
                className={commonStyles.button.secondary}
              >
                <span className="mr-2">📄</span>
                Raw JSON
              </a>
            </div>
          </div>
        </div>

        {/* Tables Section */}
        {tables && tables.length > 0 ? (
          <div className="space-y-8">
            {tables.map((table, index) => (
              <div key={index} className={commonStyles.card}>
                {/* Table Header */}
                <div className="border-b border-gray-200 pb-6 mb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`${commonStyles.heading.h3} mb-3`}>
                        {table.society_name || "Unnamed Society"}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          <span className="font-medium text-gray-700">Village:</span>
                          <span className="ml-2 text-gray-900">{table.village_name || "N/A"}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          <span className="font-medium text-gray-700">Date:</span>
                          <span className="ml-2 text-gray-900">{table.date || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={commonStyles.badge.primary}>
                        Table {index + 1}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Entries Table */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className={`${commonStyles.heading.h4} flex items-center`}>
                      <span className="mr-2">📋</span>
                      Account Entries
                    </h4>
                    <span className="text-sm text-gray-500">
                      {table.entries?.length || 0} entries
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-800">
                            Account Name
                          </th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-800">
                            Account Number
                          </th>
                          <th className="text-right px-4 py-3 text-sm font-semibold text-gray-800">
                            Amount
                          </th>
                          <th className="text-right px-4 py-3 text-sm font-semibold text-gray-800">
                            Total Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {table.entries && table.entries.length > 0 ? (
                          table.entries.map((entry, entryIndex) => (
                            <tr key={entryIndex} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                {entry.account_name}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {entry.account_number ? (
                                  <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                                    {entry.account_number}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono">
                                <span className="bg-blue-50 px-2 py-1 rounded">
                                  ₹{formatAmount(entry.amount)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono">
                                <span className="bg-green-50 px-2 py-1 rounded font-semibold">
                                  ₹{formatAmount(entry.total_amount)}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-12 text-center">
                              <div className="text-gray-400">
                                <span className="text-3xl block mb-2">📝</span>
                                <span className="text-sm">No entries found</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals Grid */}
                {table.totals && Object.keys(table.totals).length > 0 && (
                  <div className="mb-6">
                    <h4 className={`${commonStyles.heading.h4} mb-4 flex items-center`}>
                      <span className="mr-2">💰</span>
                      Financial Summary
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(table.totals).map(([key, value]) => (
                        <div key={key} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border">
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="text-xl font-bold text-gray-900 font-mono">
                            {typeof value === 'number' ? `₹${formatAmount(value)}` : value || "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amount in Words */}
                {table.amount_in_words && (
                  <div className="mb-6">
                    <h4 className={`${commonStyles.heading.h4} mb-3 flex items-center`}>
                      <span className="mr-2">📝</span>
                      Amount in Words
                    </h4>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                      <p className="text-gray-800 italic font-medium leading-relaxed">
                        "{table.amount_in_words}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={commonStyles.card}>
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-gray-400 text-3xl">📊</span>
              </div>
              <h3 className={`${commonStyles.heading.h3} mb-2`}>No Daybook Data Found</h3>
              <p className="text-gray-500 mb-4">
                This could be due to parsing errors or empty content in the PDF.
              </p>
              <div className="text-sm text-gray-400">
                Try re-uploading the document or selecting a different parser.
              </div>
            </div>
          </div>
        )}
        
        {/* Footer Info */}
        {data.uploaded_at && (
          <div className={`${commonStyles.card} mt-8`}>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center">
                <span className="mr-2">📅</span>
                <span>Uploaded: {new Date(data.uploaded_at).toLocaleString()}</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">🔧</span>
                <span>Parser: {data.parser}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 