import React, { useState, useCallback } from 'react';
import { BaseParsedData } from './preview/PreviewRegistry';

interface DynamicDataEditorProps {
  data: BaseParsedData | null;
  onChange: (data: BaseParsedData) => void;
  onSave: () => void;
}

interface FieldInfo {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  value: any;
  isEditable: boolean;
}

interface SchemaInfo {
  fields: FieldInfo[];
  hasArrays: boolean;
  hasObjects: boolean;
}

const DynamicDataEditor: React.FC<DynamicDataEditorProps> = ({ data, onChange, onSave }) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Analyze JSON structure to determine schema
  const analyzeSchema = useCallback((obj: any, prefix = ''): SchemaInfo => {
    const fields: FieldInfo[] = [];
    let hasArrays = false;
    let hasObjects = false;

    if (!obj || typeof obj !== 'object') {
      return { fields, hasArrays, hasObjects };
    }

    Object.entries(obj).forEach(([key, value]) => {
      const fieldKey = prefix ? `${prefix}.${key}` : key;
      const valueType = Array.isArray(value) ? 'array' : typeof value;
      
      if (valueType === 'array') {
        hasArrays = true;
      } else if (valueType === 'object' && value !== null) {
        hasObjects = true;
      }

      // Determine if field should be editable
      const isEditable = ['string', 'number', 'boolean'].includes(valueType) && 
                        !['_id', 'file_id', 'parser', 'parsed', 'saved', 'saved_at', 'uploaded_at'].includes(key);

      fields.push({
        key: fieldKey,
        type: valueType as any,
        value,
        isEditable
      });

      // Recursively analyze nested objects (but not arrays for now)
      if (valueType === 'object' && value !== null && !Array.isArray(value)) {
        const nestedSchema = analyzeSchema(value, fieldKey);
        fields.push(...nestedSchema.fields);
        hasArrays = hasArrays || nestedSchema.hasArrays;
        hasObjects = hasObjects || nestedSchema.hasObjects;
      }
    });

    return { fields, hasArrays, hasObjects };
  }, []);

  // Get value from nested object path
  const getNestedValue = useCallback((obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }, []);

  // Set value in nested object path
  const setNestedValue = useCallback((obj: any, path: string, value: any): any => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
    return obj;
  }, []);

  const handleFieldEdit = (fieldKey: string, currentValue: any) => {
    setEditingField(fieldKey);
    setEditValue(String(currentValue || ''));
  };

  const handleFieldSave = (fieldKey: string, fieldType: string) => {
    if (!data) return;

    const newData = JSON.parse(JSON.stringify(data));
    
    // Convert value based on type
    let convertedValue: any = editValue;
    if (fieldType === 'number') {
      convertedValue = parseFloat(editValue) || 0;
    } else if (fieldType === 'boolean') {
      convertedValue = editValue.toLowerCase() === 'true';
    }

    setNestedValue(newData, fieldKey, convertedValue);
    onChange(newData);
    setEditingField(null);
  };

  const handleFieldBlur = (fieldKey: string, fieldType: string) => {
    if (editingField === fieldKey) {
      handleFieldSave(fieldKey, fieldType);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, fieldKey: string, fieldType: string) => {
    if (e.key === 'Enter') {
      handleFieldSave(fieldKey, fieldType);
    } else if (e.key === 'Escape') {
      setEditingField(null);
    }
  };

  // Render array items (for complex structures like tables)
  const renderArrayField = (fieldKey: string, arrayValue: any[]) => {
    if (!Array.isArray(arrayValue) || arrayValue.length === 0) {
      return (
        <div className="text-grey-500 text-sm italic">
          Empty array
        </div>
      );
    }

    // Check if array contains objects (like table rows)
    const firstItem = arrayValue[0];
    if (typeof firstItem === 'object' && firstItem !== null) {
      return (
        <div className="space-y-4">
          <div className="text-xs text-grey-400 mb-2">
            {arrayValue.length} item(s) - Complex object editing coming soon
          </div>
          <div className="bg-grey-900 p-3 rounded text-xs text-grey-400 max-h-32 overflow-y-auto">
            <pre>{JSON.stringify(arrayValue, null, 2)}</pre>
          </div>
        </div>
      );
    }

    // Simple array of primitives
    return (
      <div className="space-y-2">
        {arrayValue.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-xs text-grey-500">{index}:</span>
            <span className="text-sm text-grey-200">{String(item)}</span>
          </div>
        ))}
      </div>
    );
  };

  // Render individual field
  const renderField = (field: FieldInfo) => {
    const currentValue = getNestedValue(data, field.key);
    const isEditing = editingField === field.key;

    // Handle arrays specially
    if (field.type === 'array') {
      return (
        <div key={field.key} className="border border-grey-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-grey-300">
              {field.key.split('.').pop()?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
            <span className="text-xs text-grey-500">Array</span>
          </div>
          {renderArrayField(field.key, currentValue)}
        </div>
      );
    }

    // Handle objects specially
    if (field.type === 'object' && currentValue !== null) {
      return (
        <div key={field.key} className="border border-grey-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-grey-300">
              {field.key.split('.').pop()?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
            <span className="text-xs text-grey-500">Object</span>
          </div>
          <div className="bg-grey-900 p-3 rounded text-xs text-grey-400 max-h-32 overflow-y-auto">
            <pre>{JSON.stringify(currentValue, null, 2)}</pre>
          </div>
        </div>
      );
    }

    // Handle primitive types
    if (!field.isEditable) {
      return (
        <div key={field.key} className="border border-grey-800 rounded-lg p-4 opacity-60">
          <label className="block text-sm font-medium text-grey-400 mb-2">
            {field.key.split('.').pop()?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            <span className="text-xs ml-2">(read-only)</span>
          </label>
          <div className="text-sm text-grey-500">
            {String(currentValue)}
          </div>
        </div>
      );
    }

    return (
      <div key={field.key} className="border border-grey-800 rounded-lg p-4">
        <label className="block text-sm font-medium text-grey-300 mb-2">
          {field.key.split('.').pop()?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          <span className="text-xs text-grey-500 ml-2">({field.type})</span>
        </label>

        {isEditing ? (
          <input
            type={field.type === 'number' ? 'number' : 'text'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleFieldBlur(field.key, field.type)}
            onKeyDown={(e) => handleKeyDown(e, field.key, field.type)}
            className="w-full p-2 bg-grey-800 border border-grey-500 text-grey-200 text-sm rounded focus:outline-none focus:border-grey-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            autoFocus
          />
        ) : (
          <div
            onClick={() => handleFieldEdit(field.key, currentValue)}
            className="p-2 text-grey-200 text-sm cursor-pointer hover:bg-grey-800 rounded border border-transparent hover:border-grey-700 transition-colors"
            title="Click to edit"
          >
            {field.type === 'boolean' 
              ? (currentValue ? 'true' : 'false')
              : (currentValue || 'Click to edit')
            }
          </div>
        )}
      </div>
    );
  };

  if (!data) {
    return (
      <div className="p-6 text-center text-grey-400">
        No data available for editing
      </div>
    );
  }

  const schema = analyzeSchema(data);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schema.fields.map(renderField)}
      </div>

      {(schema.hasArrays || schema.hasObjects) && (
        <div className="border-t border-grey-800 pt-4">
          <div className="text-sm text-grey-400 text-center">
            💡 Complex structures (arrays/objects) are shown for reference. 
            Advanced editing features for nested data coming soon.
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicDataEditor;
