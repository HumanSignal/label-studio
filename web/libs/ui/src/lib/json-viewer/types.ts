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
  /** Callback when copy is triggered */
  onCopy?: () => void;
  /** Additional CSS classes */
  className?: string;
}
