import DaybookPreview from './DaybookPreview';
import GenericPreview from './GenericPreview';

// Base interface that all parsed data should follow
export interface BaseParsedData {
  file_id: string;
  parser: string;
  original_filename: string;
  uploaded_at: string;
  [key: string]: any; // Allow additional parser-specific fields
}

// Props interface for preview components
export interface PreviewComponentProps {
  data: BaseParsedData;
  originalFilename: string;
  fileId: string;
}

// Type for preview component
export type PreviewComponent = React.ComponentType<PreviewComponentProps>;

// Preview registry mapping parser names to their preview components
export const previewRegistry: Record<string, PreviewComponent> = {
  'daybookparser': DaybookPreview,
  // Add more parser-specific previews here as needed
  // 'invoiceparser': InvoicePreview,
  // 'receiptparser': ReceiptPreview,
  // etc.
};

// Default preview component for unknown parsers
export const defaultPreviewComponent: PreviewComponent = GenericPreview;

/**
 * Get the appropriate preview component for a given parser
 * @param parserName - The name of the parser (case insensitive)
 * @returns The preview component to use
 */
export function getPreviewComponent(parserName: string): PreviewComponent {
  const normalizedParserName = parserName.toLowerCase().trim();
  return previewRegistry[normalizedParserName] || defaultPreviewComponent;
}

/**
 * Get all registered parser names
 * @returns Array of registered parser names
 */
export function getRegisteredParsers(): string[] {
  return Object.keys(previewRegistry);
}

/**
 * Check if a parser has a custom preview component
 * @param parserName - The name of the parser
 * @returns true if parser has custom preview, false otherwise
 */
export function hasCustomPreview(parserName: string): boolean {
  const normalizedParserName = parserName.toLowerCase().trim();
  return normalizedParserName in previewRegistry;
} 