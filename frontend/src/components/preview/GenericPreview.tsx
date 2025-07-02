import { PreviewComponentProps } from './PreviewRegistry';

export default function GenericPreview({ data, originalFilename, fileId }: PreviewComponentProps) {
  const formatValue = (value: any, key: string): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-grey-600 italic">null</span>;
    }
    
    if (typeof value === 'string') {
      // Highlight URLs
      if (value.startsWith('http')) {
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            {value}
          </a>
        );
      }
      return <span className="text-green-400">"{value}"</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-yellow-400">{value}</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className="text-purple-400">{value.toString()}</span>;
    }
    
    if (Array.isArray(value)) {
      return (
        <div className="ml-4">
          <span className="text-grey-400">[</span>
          {value.map((item, index) => (
            <div key={index} className="ml-4">
              <span className="text-grey-500">{index}: </span>
              {formatValue(item, `${key}[${index}]`)}
              {index < value.length - 1 && <span className="text-grey-400">,</span>}
            </div>
          ))}
          <span className="text-grey-400">]</span>
        </div>
      );
    }
    
    if (typeof value === 'object') {
      return (
        <div className="ml-4">
          <span className="text-grey-400">{'{'}</span>
          {Object.entries(value).map(([k, v], index, arr) => (
            <div key={k} className="ml-4">
              <span className="text-blue-300">"{k}"</span>
              <span className="text-grey-400">: </span>
              {formatValue(v, `${key}.${k}`)}
              {index < arr.length - 1 && <span className="text-grey-400">,</span>}
            </div>
          ))}
          <span className="text-grey-400">{'}'}</span>
        </div>
      );
    }
    
    return <span className="text-grey-300">{JSON.stringify(value)}</span>;
  };

  const metadataFields = ['file_id', 'parser', 'original_filename', 'uploaded_at'];
  const dataFields = Object.entries(data).filter(([key]) => !metadataFields.includes(key));

  return (
    <div className="space-y-6">
      {/* Metadata Section */}
      <div className="bg-grey-900 border border-grey-800 p-4">
        <h3 className="text-sm font-medium text-grey-200 mb-3 shiny-text">Document Metadata</h3>
        <div className="space-y-2 font-mono text-sm">
          {metadataFields.map(field => (
            data[field] && (
              <div key={field} className="flex">
                <span className="text-grey-500 w-32">{field}:</span>
                <span className="text-grey-300">{data[field]}</span>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Parsed Data Section */}
      <div className="bg-black border border-grey-800 p-6">
        <h3 className="text-sm font-medium text-grey-200 mb-4 shiny-text">Parsed Data</h3>
        <div className="font-mono text-sm leading-relaxed overflow-x-auto custom-scrollbar">
          {dataFields.length > 0 ? (
            <div>
              <span className="text-grey-400">{'{'}</span>
              {dataFields.map(([key, value], index) => (
                <div key={key} className="ml-4">
                  <span className="text-blue-300">"{key}"</span>
                  <span className="text-grey-400">: </span>
                  {formatValue(value, key)}
                  {index < dataFields.length - 1 && <span className="text-grey-400">,</span>}
                </div>
              ))}
              <span className="text-grey-400">{'}'}</span>
            </div>
          ) : (
            <div className="text-grey-500 italic">No parsed data available</div>
          )}
        </div>
      </div>
    </div>
  );
} 