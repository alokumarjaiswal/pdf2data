import { PreviewComponentProps } from './PreviewRegistry';

export default function GenericPreview({ data, originalFilename, fileId }: PreviewComponentProps) {
  return (
    <div className="bg-black border border-grey-800 p-6">
      <pre className="text-sm text-grey-300 overflow-x-auto leading-relaxed font-mono custom-scrollbar">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
} 