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
    <div className="space-y-12">
      {/* Tables Section */}
      {tables && tables.length > 0 ? (
        <>
          {tables.map((table, index) => (
            <div key={index} className="border-b border-grey-800 pb-8 last:border-b-0">
              {/* Table Header */}
              <div className="border-b border-grey-700 pb-3 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-medium text-grey-100 mb-1 shiny-text">
                      {table.society_name || "Unnamed Society"}
                    </h3>
                    <div className="text-xs text-grey-400 font-mono">
                      Village: {table.village_name || "N/A"}
                    </div>
                  </div>
                  <div className="text-xs text-grey-400 font-mono text-right">
                    {table.date || "N/A"}
                  </div>
                </div>
              </div>

              {/* Entries Table */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-grey-300 mb-2 shiny-text">
                  Account Entries ({table.entries?.length || 0})
                </h4>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-grey-800">
                        <th className="text-left py-1.5 text-xs text-grey-500 font-mono">
                          Account Name
                        </th>
                        <th className="text-center py-1.5 text-xs text-grey-500 font-mono">
                          Account Number
                        </th>
                        <th className="text-right py-1.5 text-xs text-grey-500 font-mono">
                          Amount
                        </th>
                        <th className="text-right py-1.5 text-xs text-grey-500 font-mono">
                          Total Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.entries && table.entries.length > 0 ? (
                        table.entries.map((entry, entryIndex) => (
                          <tr key={entryIndex} className="border-b border-grey-800 last:border-b-0">
                            <td className="py-1.5 text-xs text-grey-200 font-mono">
                              {entry.account_name}
                            </td>
                            <td className="py-1.5 text-xs text-grey-400 font-mono text-center">
                              {entry.account_number || "-"}
                            </td>
                            <td className="py-1.5 text-xs text-grey-200 text-right font-mono">
                              ₹{formatAmount(entry.amount)}
                            </td>
                            <td className="py-1.5 text-xs text-grey-100 text-right font-mono">
                              ₹{formatAmount(entry.total_amount)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-6 text-center">
                            <div className="text-grey-500 font-mono text-xs">
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
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-grey-300 mb-2 shiny-text">
                    Financial Summary
                  </h4>
                  <div className="space-y-1">
                    {Object.entries(table.totals).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <div className="text-xs text-grey-400 font-mono">
                          {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-xs text-grey-100 font-mono">
                          {typeof value === 'number' ? `₹${formatAmount(value)}` : value || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Amount in Words */}
              {table.amount_in_words && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-grey-300 mb-2 shiny-text">
                    Amount in Words
                  </h4>
                  <p className="text-grey-300 italic font-mono text-xs leading-relaxed">
                    "{table.amount_in_words}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </>
      ) : (
        <div className="py-12 text-center">
          <p className="text-grey-400 font-mono mb-1 text-xs">No daybook data found</p>
          <p className="text-grey-500 text-xs font-mono">
            This could be due to parsing errors or empty content in the PDF.
          </p>
        </div>
      )}
    </div>
  );
} 