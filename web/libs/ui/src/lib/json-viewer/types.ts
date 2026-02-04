export interface FilterConfig {
  id: string;
  label: string;
  filterFn: (nodeData: any) => boolean;
}

export interface JsonViewerProps {
  // Core data
  /** JSON data to display */
  data: any;

  // Behavior
  /** Read-only mode */
  viewOnly?: boolean;

  // UI Controls visibility
  /** Show/hide search bar */
  showSearch?: boolean;
  /** Show/hide filter buttons */
  showFilters?: boolean;
  /** Show/hide copy JSON button */
  showCopyButton?: boolean;

  // Features
  /** Optional custom filter buttons */
  customFilters?: FilterConfig[];
  /** Threshold (in characters) for showing Reader View button on strings. Set to 0 to disable. Default: 100 */
  readerViewThreshold?: number;
  /** Storage key for localStorage persistence of filters and search state */
  storageKey?: string;
  /** Additional elements to render in the toolbar (after filters) */
  toolbarExtra?: React.ReactNode;

  // Display settings
  /** Container min height */
  minHeight?: string | number;
  /** Container max height */
  maxHeight?: string | number;
  /** Font size for the JSON content (passed to json-edit-react's rootFontSize) */
  fontSize?: string | number;
  /** Number of characters before truncating strings (click to expand) */
  stringTruncate?: number;

  // Styling
  /** Additional CSS classes */
  className?: string;
  /** Use inset styles for the container */
  inset?: boolean;

  // Callbacks
  /** Callback when copy is triggered */
  onCopy?: () => void;
}
