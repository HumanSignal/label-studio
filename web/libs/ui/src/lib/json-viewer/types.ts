export interface FilterConfig {
  id: string;
  label: string;
  filterFn: (nodeData: any) => boolean;
}

export interface JsonViewerProps {
  /** JSON data to display */
  data: any;
  /** Read-only mode */
  viewOnly?: boolean;
  /** Show/hide search bar */
  showSearch?: boolean;
  /** Optional custom filter buttons */
  customFilters?: FilterConfig[];
  /** Container min height */
  minHeight?: string | number;
  /** Container max height */
  maxHeight?: string | number;
  /** Font size for the JSON content (passed to json-edit-react's rootFontSize) */
  fontSize?: string | number;
  /** Number of characters before truncating strings (click to expand) */
  stringTruncate?: number;
  /** Callback when copy is triggered */
  onCopy?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Threshold (in characters) for showing Reader View button on strings. Set to 0 to disable. Default: 100 */
  readerViewThreshold?: number;
}
