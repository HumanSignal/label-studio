import { useState, type ReactNode } from "react";
import { cn } from "../../utils/utils";
import { IconChevronDown, IconChevron } from "@humansignal/icons";
import { Button } from "../button/button";

export type CollapsiblePanelProps = {
  /** Visual variant of the panel */
  variant?: "primary" | "default";
  /** Panel title */
  title: ReactNode;
  /** Optional count badge/number to display */
  count?: number;
  /** Action buttons or elements (e.g., Clear Selection) */
  actions?: ReactNode;
  /** Panel content */
  children?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether the panel starts expanded */
  defaultExpanded?: boolean;
  /** Controlled expanded state */
  expanded?: boolean;
  /** Callback when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Disable the toggle button (prevents collapsing/expanding) */
  disableToggle?: boolean;
};

export const CollapsiblePanel = ({
  variant = "default",
  title,
  count,
  actions,
  children,
  className,
  defaultExpanded = true,
  expanded: controlledExpanded,
  onExpandedChange,
  disableToggle = false,
}: CollapsiblePanelProps) => {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  // Use controlled state if provided, otherwise use internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const isControlled = controlledExpanded !== undefined;

  const handleToggle = () => {
    if (disableToggle) return;

    const newExpanded = !isExpanded;

    if (isControlled && onExpandedChange) {
      onExpandedChange(newExpanded);
    } else {
      setInternalExpanded(newExpanded);
    }
  };

  // Variant styles
  const variantStyles = {
    primary: {
      container: "border-primary-border-subtlest",
      header: "bg-primary-background hover:bg-primary-background-hover",
    },
    default: {
      container: "border-neutral-border",
      header: "bg-neutral-surface hover:bg-neutral-surface-hover",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn("border rounded-md overflow-hidden", styles.container, className)}>
      {/* Header - Always visible */}
      <div
        className={cn(
          "flex items-center gap-2 px-base py-tight",
          !disableToggle && "cursor-pointer",
          !disableToggle && styles.header,
          "transition-colors",
        )}
        onClick={handleToggle}
      >
        <Button
          variant="neutral"
          look="string"
          size="small"
          className={cn(
            "flex items-center justify-center text-neutral-content-subtle transition-colors",
            !disableToggle && "hover:text-neutral-content",
            disableToggle && "opacity-40 cursor-not-allowed pointer-events-none",
          )}
          disabled={disableToggle}
          aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
          aria-expanded={isExpanded}
        >
          {isExpanded ? <IconChevron size={16} /> : <IconChevronDown size={16} />}
        </Button>

        <div className="flex-1 flex items-center gap-2 truncate">
          <span className="text-sm font-medium truncate">{title}</span>
          {count !== undefined && count > 0 && <span className="text-sm text-neutral-content-subtle">({count})</span>}
        </div>

        {actions && (
          <div
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {actions}
          </div>
        )}
      </div>

      {/* Content - Collapsible */}
      {isExpanded && children && <div className="border-t border-inherit">{children}</div>}
    </div>
  );
};
