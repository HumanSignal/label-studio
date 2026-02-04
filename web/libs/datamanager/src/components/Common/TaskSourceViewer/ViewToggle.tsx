import type { ChangeEvent } from "react";
import { useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, Toggle } from "@humansignal/ui";

export type ViewMode = "code" | "interactive";

interface ViewToggleProps {
  /** Current view mode (code or interactive) */
  view: ViewMode;
  /** Callback when view mode changes */
  onViewChange: (view: ViewMode) => void;
  /** Whether to show resolved URLs (proxy URLs) or original storage URLs */
  resolveUrls?: boolean;
  /** Callback when resolve URLs toggle changes */
  onResolveUrlsChange?: (resolve: boolean) => void;
  /** Additional CSS class */
  className?: string;
}

/**
 * ViewToggle - Controls for task source viewer display options
 *
 * Provides two controls:
 * 1. View mode toggle (Code/Interactive) - switches between JSON code view and interactive tree
 * 2. Resolve URLs toggle - when OFF, shows original storage URLs (s3://..., gs://...),
 *    when ON, shows resolved proxy URLs (/tasks/.../resolve/...)
 */
export const ViewToggle = ({
  view,
  onViewChange,
  resolveUrls = false,
  onResolveUrlsChange,
  className,
}: ViewToggleProps) => {
  const handleResolveUrlsChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onResolveUrlsChange?.(e.target.checked);
    },
    [onResolveUrlsChange],
  );

  return (
    <div className="flex items-center gap-4">
      <Tabs value={view} onValueChange={onViewChange as (v: string) => void} variant="default">
        <TabsList className={className}>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="interactive">Interactive</TabsTrigger>
        </TabsList>
      </Tabs>

      {onResolveUrlsChange && <Toggle label="Resolve URLs" checked={resolveUrls} onChange={handleResolveUrlsChange} />}
    </div>
  );
};
