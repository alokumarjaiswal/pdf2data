import { PreviewComponentProps } from './PreviewRegistry';
import { commonStyles } from '../../theme';

export default function GenericPreview({ data, originalFilename, fileId }: PreviewComponentProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header Card */}
        <div className={`${commonStyles.card} mb-8`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl">📄</span>
              </div>
              <div>
                <h1 className={`${commonStyles.heading.h2} mb-2`}>
                  Document Processing Complete
                </h1>
                <p className="text-lg text-gray-600 mb-3">{originalFilename}</p>
                <div className="flex items-center gap-3">
                  <span className={commonStyles.badge.warning}>
                    {data.parser} (Generic View)
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
                <span className="mr-2">🔗</span>
                Raw JSON
              </a>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className={`${commonStyles.alert.warning} mb-8`}>
          <div className="flex items-start">
            <span className="text-yellow-600 text-xl mr-3 flex-shrink-0">ℹ️</span>
            <div>
              <h3 className="font-semibold text-yellow-800 mb-1">Generic View Active</h3>
              <p className="text-yellow-700 text-sm">
                No custom preview template is available for the "{data.parser}" parser. 
                The raw JSON data is displayed below. Consider creating a custom preview component for better visualization.
              </p>
            </div>
          </div>
        </div>

        {/* JSON Output Card */}
        <div className={commonStyles.card}>
          <div className="mb-6">
            <h3 className={`${commonStyles.heading.h3} mb-2 flex items-center`}>
              <span className="mr-2">🗂️</span>
              Extracted Data
            </h3>
            <p className="text-gray-600">
              Complete structured data extracted from your document
            </p>
          </div>

          <div className="bg-gray-900 rounded-xl overflow-hidden border">
            <div className="bg-gray-800 px-6 py-3 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-300 flex items-center">
                  <span className="mr-2">📋</span>
                  JSON Output
                </h4>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${'bg-green-800 text-green-200'}`}>
                    Valid JSON
                  </span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
                    className="text-gray-400 hover:text-white text-xs"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <pre className="text-sm text-green-400 overflow-x-auto max-h-96 overflow-y-auto leading-relaxed">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>

          {/* Data Statistics */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 text-sm">📊</span>
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Data Size</p>
                  <p className="text-lg font-bold text-blue-900">
                    {(JSON.stringify(data).length / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-green-600 text-sm">🔑</span>
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Fields</p>
                  <p className="text-lg font-bold text-green-900">
                    {Object.keys(data).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-purple-600 text-sm">🔧</span>
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Parser</p>
                  <p className="text-lg font-bold text-purple-900">{data.parser}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Development Note */}
        <div className={`${commonStyles.card} mt-8`}>
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 text-lg">💡</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Enhance Your Experience</h4>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                To create a better viewing experience for this parser, consider developing a custom preview component 
                that formats and displays the data in a more user-friendly way.
              </p>
              <div className="text-xs text-gray-500">
                Add your parser to the preview registry in <code className="bg-gray-100 px-1 rounded">PreviewRegistry.tsx</code>
              </div>
            </div>
          </div>
        </div>
        
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