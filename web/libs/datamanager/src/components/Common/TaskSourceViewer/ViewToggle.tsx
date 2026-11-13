import { SegmentedControl } from "@humansignal/ui";

export type ViewMode = "code" | "interactive";

interface ViewToggleProps {
  /** Current view mode (code or interactive) */
  view: ViewMode;
  /** Callback when view mode changes */
  onViewChange: (view: ViewMode) => void;
  /** Additional CSS class */
  className?: string;
}

/**
 * ViewToggle - Controls for switching between Code and Interactive view modes
 */
export const ViewToggle = ({ view, onViewChange, className }: ViewToggleProps) => {
  return (
    <SegmentedControl
      className={className}
      aria-label="View mode"
      selectedOption={view}
      onChange={(newValue) => onViewChange(newValue as ViewMode)}
      options={[
        { value: "interactive", label: "Interactive" },
        { value: "code", label: "Code" },
      ]}
    />
  );
};
