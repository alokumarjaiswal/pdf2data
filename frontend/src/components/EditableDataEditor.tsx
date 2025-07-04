
import React, { useState, useCallback } from 'react';
import { BaseParsedData } from './preview/PreviewRegistry';

interface EditableDataEditorProps {
  data: BaseParsedData | null;
  onChange: (data: BaseParsedData) => void;
  onSave: () => void;
}

interface EditableTableProps {
  data: any;
  onChange: (data: any) => void;
}

const EditableTable: React.FC<EditableTableProps> = ({ data, onChange }) => {
  const [editingCell, setEditingCell] = useState<{tableIndex: number, rowIndex: number, field: string} | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleCellEdit = (tableIndex: number, rowIndex: number, field: string, currentValue: any) => {
    setEditingCell({ tableIndex, rowIndex, field });
    setEditValue(String(currentValue || ''));
  };

  const handleCellSave = (tableIndex: number, rowIndex: number, field: string, value: string) => {
    const newData = { ...data };
    
    if (!newData.tables[tableIndex].entries) {
      newData.tables[tableIndex].entries = [];
    }
    
    if (!newData.tables[tableIndex].entries[rowIndex]) {
      newData.tables[tableIndex].entries[rowIndex] = {};
    }
    
    // Type conversion based on field
    let convertedValue: any = value;
    if (field === 'amount' || field === 'total_amount') {
      convertedValue = parseFloat(value) || 0;
    }
    
    newData.tables[tableIndex].entries[rowIndex][field] = convertedValue;
    onChange(newData);
    setEditingCell(null);
  };

  const handleCellBlur = (tableIndex: number, rowIndex: number, field: string) => {
    if (editingCell?.tableIndex === tableIndex && editingCell?.rowIndex === rowIndex && editingCell?.field === field) {
      handleCellSave(tableIndex, rowIndex, field, editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, tableIndex: number, rowIndex: number, field: string) => {
    if (e.key === 'Enter') {
      handleCellSave(tableIndex, rowIndex, field, editValue);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleHeaderEdit = (tableIndex: number, field: string, value: string) => {
    const newData = { ...data };
    newData.tables[tableIndex][field] = value;
    onChange(newData);
  };

  const addNewRow = (tableIndex: number) => {
    const newData = { ...data };
    if (!newData.tables[tableIndex].entries) {
      newData.tables[tableIndex].entries = [];
    }
    
    newData.tables[tableIndex].entries.push({
      account_name: '',
      account_number: '',
      amount: 0,
      total_amount: 0
    });
    
    onChange(newData);
  };

  const insertRowAfter = (tableIndex: number, rowIndex: number) => {
    const newData = { ...data };
    if (!newData.tables[tableIndex].entries) {
      newData.tables[tableIndex].entries = [];
    }
    
    // Insert new row after the current row
    newData.tables[tableIndex].entries.splice(rowIndex + 1, 0, {
      account_name: '',
      account_number: '',
      amount: 0,
      total_amount: 0
    });
    
    onChange(newData);
  };

  const deleteRow = (tableIndex: number, rowIndex: number) => {
    const newData = { ...data };
    newData.tables[tableIndex].entries.splice(rowIndex, 1);
    onChange(newData);
  };

  const handleTotalEdit = (tableIndex: number, field: string, value: string) => {
    const newData = { ...data };
    if (!newData.tables[tableIndex].totals) {
      newData.tables[tableIndex].totals = {};
    }
    newData.tables[tableIndex].totals[field] = parseFloat(value) || 0;
    onChange(newData);
  };

  const addNewTable = () => {
    const newData = { ...data };
    if (!newData.tables) {
      newData.tables = [];
    }
    
    newData.tables.push({
      society_name: '',
      village_name: '',
      date: '',
      entries: [],
      totals: {
        grand_total_credit: 0,
        total_debit: 0,
        grand_total_debit: 0,
        cash_in_hand: 0
      },
      amount_in_words: ''
    });
    
    onChange(newData);
  };

  const insertTableAt = (position: number) => {
    const newData = { ...data };
    if (!newData.tables) {
      newData.tables = [];
    }
    
    const newTable = {
      society_name: '',
      village_name: '',
      date: '',
      entries: [],
      totals: {
        grand_total_credit: 0,
        total_debit: 0,
        grand_total_debit: 0,
        cash_in_hand: 0
      },
      amount_in_words: ''
    };
    
    newData.tables.splice(position, 0, newTable);
    onChange(newData);
  };

  const deleteTable = (tableIndex: number) => {
    const newData = { ...data };
    newData.tables.splice(tableIndex, 1);
    onChange(newData);
  };

  if (!data.tables || !Array.isArray(data.tables)) {
    return (
      <div className="p-6 text-center text-grey-400">
        No table structure found in data
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Add Table Button - Top */}
      <div className="flex justify-center">
        <button
          onClick={() => insertTableAt(0)}
          className="w-8 h-8 text-grey-400 hover:text-grey-200 text-xl font-bold transition-colors flex items-center justify-center"
          title="Add new table at the beginning"
        >
          +
        </button>
      </div>

      {data.tables.map((table: any, tableIndex: number) => (
        <div key={tableIndex}>
          {/* Add Table Button - Between Tables */}
          {tableIndex > 0 && (
            <div className="flex justify-center my-4">
              <button
                onClick={() => insertTableAt(tableIndex)}
                className="w-8 h-8 text-grey-400 hover:text-grey-200 text-xl font-bold transition-colors flex items-center justify-center"
                title={`Add new table before Table ${tableIndex + 1}`}
              >
                +
              </button>
            </div>
          )}
          
          <div className="border border-grey-800 rounded-lg overflow-hidden">
          
          {/* Table Header with Delete Option */}
          <div className="bg-grey-900 p-4 border-b border-grey-800">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-medium text-grey-300">Table {tableIndex + 1}</h4>
              {data.tables.length > 1 && (
                <button
                  onClick={() => deleteTable(tableIndex)}
                  className="w-6 h-6 text-grey-500 hover:text-grey-300 text-lg font-bold transition-colors flex items-center justify-center"
                  title="Delete this table"
                >
                  -
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Society Name */}
              <div>
                <label className="block text-xs text-grey-400 mb-1">Society Name</label>
                <input
                  type="text"
                  value={table.society_name || ''}
                  onChange={(e) => handleHeaderEdit(tableIndex, 'society_name', e.target.value)}
                  className="w-full p-2 bg-grey-800 border border-grey-700 text-grey-200 text-sm rounded focus:border-grey-500 focus:outline-none"
                />
              </div>
              
              {/* Village Name */}
              <div>
                <label className="block text-xs text-grey-400 mb-1">Village</label>
                <input
                  type="text"
                  value={table.village_name || ''}
                  onChange={(e) => handleHeaderEdit(tableIndex, 'village_name', e.target.value)}
                  className="w-full p-2 bg-grey-800 border border-grey-700 text-grey-200 text-sm rounded focus:border-grey-500 focus:outline-none"
                />
              </div>
              
              {/* Date */}
              <div>
                <label className="block text-xs text-grey-400 mb-1">Date</label>
                <input
                  type="text"
                  value={table.date || ''}
                  onChange={(e) => handleHeaderEdit(tableIndex, 'date', e.target.value)}
                  className="w-full p-2 bg-grey-800 border border-grey-700 text-grey-200 text-sm rounded focus:border-grey-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Entries Table */}
          <div className="p-4">
            <div className="mb-4">
              <h4 className="text-sm font-medium text-grey-300">Account Entries</h4>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-grey-800">
                    <th className="text-left py-2 px-3 text-xs text-grey-400 font-medium w-1/3">Account Name</th>
                    <th className="text-center py-2 px-3 text-xs text-grey-400 font-medium w-1/6">Account Number</th>
                    <th className="text-right py-2 px-3 text-xs text-grey-400 font-medium w-1/6">Amount</th>
                    <th className="text-right py-2 px-3 text-xs text-grey-400 font-medium w-1/6">Total Amount</th>
                    <th className="text-center py-2 px-3 text-xs text-grey-400 font-medium w-1/6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {table.entries && table.entries.map((entry: any, rowIndex: number) => (
                    <tr key={rowIndex} className="border-b border-grey-800 hover:bg-grey-900/30">
                      
                      {/* Account Name */}
                      <td className="py-2 px-3 align-middle">
                        {editingCell?.tableIndex === tableIndex && editingCell?.rowIndex === rowIndex && editingCell?.field === 'account_name' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellBlur(tableIndex, rowIndex, 'account_name')}
                            onKeyDown={(e) => handleKeyDown(e, tableIndex, rowIndex, 'account_name')}
                            className="w-full p-1 bg-grey-800 border border-grey-500 text-grey-200 text-xs rounded focus:outline-none focus:border-grey-400"
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => handleCellEdit(tableIndex, rowIndex, 'account_name', entry.account_name)}
                            className="p-1 text-grey-200 text-xs cursor-pointer hover:bg-grey-800 rounded truncate"
                            title={entry.account_name || 'Click to edit'}
                          >
                            {entry.account_name || 'Click to edit'}
                          </div>
                        )}
                      </td>
                      
                      {/* Account Number */}
                      <td className="py-2 px-3 align-middle">
                        {editingCell?.tableIndex === tableIndex && editingCell?.rowIndex === rowIndex && editingCell?.field === 'account_number' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellBlur(tableIndex, rowIndex, 'account_number')}
                            onKeyDown={(e) => handleKeyDown(e, tableIndex, rowIndex, 'account_number')}
                            className="w-full p-1 bg-grey-800 border border-grey-500 text-grey-200 text-xs rounded focus:outline-none focus:border-grey-400 text-center"
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => handleCellEdit(tableIndex, rowIndex, 'account_number', entry.account_number)}
                            className="p-1 text-grey-300 text-xs cursor-pointer hover:bg-grey-800 rounded text-center truncate"
                            title={entry.account_number || 'Click to edit'}
                          >
                            {entry.account_number || '-'}
                          </div>
                        )}
                      </td>
                      
                      {/* Amount */}
                      <td className="py-2 px-3 align-middle">
                        {editingCell?.tableIndex === tableIndex && editingCell?.rowIndex === rowIndex && editingCell?.field === 'amount' ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellBlur(tableIndex, rowIndex, 'amount')}
                            onKeyDown={(e) => handleKeyDown(e, tableIndex, rowIndex, 'amount')}
                            className="w-full p-1 bg-grey-800 border border-grey-500 text-grey-200 text-xs rounded focus:outline-none focus:border-grey-400 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => handleCellEdit(tableIndex, rowIndex, 'amount', entry.amount)}
                            className="p-1 text-grey-200 text-xs cursor-pointer hover:bg-grey-800 rounded text-right truncate"
                            title={`₹${(entry.amount || 0).toFixed(2)}`}
                          >
                            ₹{(entry.amount || 0).toFixed(2)}
                          </div>
                        )}
                      </td>
                      
                      {/* Total Amount */}
                      <td className="py-2 px-3 align-middle">
                        {editingCell?.tableIndex === tableIndex && editingCell?.rowIndex === rowIndex && editingCell?.field === 'total_amount' ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellBlur(tableIndex, rowIndex, 'total_amount')}
                            onKeyDown={(e) => handleKeyDown(e, tableIndex, rowIndex, 'total_amount')}
                            className="w-full p-1 bg-grey-800 border border-grey-500 text-grey-200 text-xs rounded focus:outline-none focus:border-grey-400 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => handleCellEdit(tableIndex, rowIndex, 'total_amount', entry.total_amount)}
                            className="p-1 text-grey-200 text-xs cursor-pointer hover:bg-grey-800 rounded text-right truncate"
                            title={`₹${(entry.total_amount || 0).toFixed(2)}`}
                          >
                            ₹{(entry.total_amount || 0).toFixed(2)}
                          </div>
                        )}
                      </td>
                      
                      {/* Actions */}
                      <td className="py-2 px-3 align-middle">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => insertRowAfter(tableIndex, rowIndex)}
                            className="w-5 h-5 text-grey-400 hover:text-grey-200 text-sm font-bold transition-colors flex items-center justify-center"
                            title="Insert row after this one"
                          >
                            +
                          </button>
                          <button
                            onClick={() => deleteRow(tableIndex, rowIndex)}
                            className="w-5 h-5 text-grey-500 hover:text-grey-300 text-sm font-bold transition-colors flex items-center justify-center"
                            title="Delete this row"
                          >
                            -
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {(!table.entries || table.entries.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-grey-500 text-xs">
                        No entries. Click "+" to add the first entry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="bg-grey-900 p-4 border-t border-grey-800">
            <h4 className="text-sm font-medium text-grey-300 mb-3">Totals</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Grand Total Credit */}
              <div>
                <label className="block text-xs text-grey-400 mb-1">Grand Total Credit</label>
                <input
                  type="number"
                  step="0.01"
                  value={table.totals?.grand_total_credit || 0}
                  onChange={(e) => handleTotalEdit(tableIndex, 'grand_total_credit', e.target.value)}
                  className="w-full p-2 bg-grey-800 border border-grey-700 text-grey-200 text-sm rounded focus:border-grey-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              
              {/* Total Debit */}
              <div>
                <label className="block text-xs text-grey-400 mb-1">Total Debit</label>
                <input
                  type="number"
                  step="0.01"
                  value={table.totals?.total_debit || 0}
                  onChange={(e) => handleTotalEdit(tableIndex, 'total_debit', e.target.value)}
                  className="w-full p-2 bg-grey-800 border border-grey-700 text-grey-200 text-sm rounded focus:border-grey-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              
              {/* Grand Total Debit */}
              <div>
                <label className="block text-xs text-grey-400 mb-1">Grand Total Debit</label>
                <input
                  type="number"
                  step="0.01"
                  value={table.totals?.grand_total_debit || 0}
                  onChange={(e) => handleTotalEdit(tableIndex, 'grand_total_debit', e.target.value)}
                  className="w-full p-2 bg-grey-800 border border-grey-700 text-grey-200 text-sm rounded focus:border-grey-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              
              {/* Cash in Hand */}
              <div>
                <label className="block text-xs text-grey-400 mb-1">Cash in Hand</label>
                <input
                  type="number"
                  step="0.01"
                  value={table.totals?.cash_in_hand || 0}
                  onChange={(e) => handleTotalEdit(tableIndex, 'cash_in_hand', e.target.value)}
                  className="w-full p-2 bg-grey-800 border border-grey-700 text-grey-200 text-sm rounded focus:border-grey-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
            
            {/* Amount in Words - Full Width */}
            <div className="mt-4">
              <label className="block text-xs text-grey-400 mb-1">Amount in Words</label>
              <input
                type="text"
                value={table.amount_in_words || ''}
                onChange={(e) => handleHeaderEdit(tableIndex, 'amount_in_words', e.target.value)}
                className="w-full p-2 bg-grey-800 border border-grey-700 text-grey-200 text-sm rounded focus:border-grey-500 focus:outline-none"
                placeholder="Enter amount in words (e.g., One Lakh Twenty Five Thousand Rupees Only)"
              />
            </div>
          </div>
          </div>
        </div>
      ))}

      {/* Add Table Button - Bottom */}
      <div className="flex justify-center">
        <button
          onClick={() => insertTableAt(data.tables.length)}
          className="w-8 h-8 text-grey-400 hover:text-grey-200 text-xl font-bold transition-colors flex items-center justify-center"
          title="Add new table at the end"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default function EditableDataEditor({ data, onChange, onSave }: EditableDataEditorProps) {
  if (!data) {
    return (
      <div className="p-6 text-center text-grey-400">
        No data available for editing
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EditableTable data={data} onChange={onChange} />
    </div>
  );
}
