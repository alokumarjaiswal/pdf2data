import { PreviewComponentProps } from './PreviewRegistry';

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
    <>
      {/* Tables Section */}
        {tables && tables.length > 0 ? (
          <>
            {tables.map((table, index) => (
              <div key={index} className="bg-grey-900 border border-grey-800 p-6">
                {/* Table Header */}
                <div className="border-b border-grey-700 pb-4 mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-grey-100 mb-2 shiny-text">
                        {table.society_name || "Unnamed Society"}
                      </h3>
                      <div className="text-sm text-grey-300 font-mono">
                        Village: {table.village_name || "N/A"}
                      </div>
                    </div>
                    <div className="text-sm text-grey-300 font-mono text-right">
                      {table.date || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Entries Table */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-grey-200 mb-3 shiny-text">
                    Account Entries ({table.entries?.length || 0})
                  </h4>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-grey-800">
                          <th className="text-left py-2 text-xs text-grey-400 font-mono">
                            Account Name
                          </th>
                          <th className="text-center py-2 text-xs text-grey-400 font-mono">
                            Account Number
                          </th>
                          <th className="text-right py-2 text-xs text-grey-400 font-mono">
                            Amount
                          </th>
                          <th className="text-right py-2 text-xs text-grey-400 font-mono">
                            Total Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.entries && table.entries.length > 0 ? (
                          table.entries.map((entry, entryIndex) => (
                            <tr key={entryIndex} className="border-b border-grey-800 last:border-b-0">
                              <td className="py-2 text-sm text-grey-200 font-mono">
                                {entry.account_name}
                              </td>
                              <td className="py-2 text-sm text-grey-400 font-mono text-center">
                                {entry.account_number || "-"}
                              </td>
                              <td className="py-2 text-sm text-grey-200 text-right font-mono">
                                ₹{formatAmount(entry.amount)}
                              </td>
                              <td className="py-2 text-sm text-grey-100 text-right font-mono">
                                ₹{formatAmount(entry.total_amount)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-8 text-center">
                              <div className="text-grey-500 font-mono text-sm">
                                No entries found
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
                    <h4 className="text-sm font-medium text-grey-200 mb-3 shiny-text">
                      Financial Summary
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(table.totals).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <div className="text-sm text-grey-400 font-mono">
                            {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="text-sm text-grey-100 font-mono">
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
                    <h4 className="text-sm font-medium text-grey-200 mb-3 shiny-text">
                      Amount in Words
                    </h4>
                    <p className="text-grey-300 italic font-mono text-sm leading-relaxed">
                      "{table.amount_in_words}"
                    </p>
                  </div>
                )}
              </div>
            ))}
          </>
                ) : (
          <div className="bg-grey-900 border border-grey-800 p-12 text-center">
            <p className="text-grey-400 font-mono mb-2">No daybook data found</p>
            <p className="text-grey-500 text-sm font-mono">
              This could be due to parsing errors or empty content in the PDF.
            </p>
          </div>
        )}
    </>
  );
} 