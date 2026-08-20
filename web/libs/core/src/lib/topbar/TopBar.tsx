/**
 * Shared, presentational TopBar shell.
 *
 * Pure props in / pure callbacks out. No MST, no Jotai. The carousel is provided as
 * `children` so each editor's wrapper composes its own (typically the shared
 * AnnotationsCarousel wrapped with editor-specific state-binding).
 *
 * Visibility gates (bulk mode, starter plan, `topbar` interface) live in the per-editor
 * wrapper — when the wrapper decides not to show the bar at all, it passes `visible={false}`.
 */

import type { ReactNode } from "react";
import { IconPlus } from "@humansignal/icons";
import { Button } from "@humansignal/ui";
import { cnb as cn } from "../utils/bem";
import { ViewAllToggle } from "./ViewAllToggle";
import "./TopBar.prefix.css";

export interface SharedTopBarProps {
  /** Whether to render the bar at all (false = nothing rendered). */
  visible: boolean;
  showViewAll: boolean;
  isViewAll: boolean;
  onToggleViewAll: () => void;
  /** Overrides the view-all button caption; see `ViewAllToggle`. */
  viewAllLabel?: string;
  showAddNew: boolean;
  onAddNew: () => void;
  /** Carousel slot — usually the shared AnnotationsCarousel composed by the wrapper. */
  children?: ReactNode;
}

export function TopBar({
  visible,
  showViewAll,
  isViewAll,
  onToggleViewAll,
  viewAllLabel,
  showAddNew,
  onAddNew,
  children,
}: SharedTopBarProps) {
  if (!visible) return null;

  return (
    <div className={cn("topbar").mod({ newLabelingUI: true }).toClassName()}>
      <div className={cn("topbar").elem("group").toClassName()}>
        {showViewAll && <ViewAllToggle isActive={isViewAll} onClick={onToggleViewAll} label={viewAllLabel} />}
        {showAddNew && (
          <Button
            className={cn("topbar").elem("button").toClassName()}
            type={isViewAll ? undefined : "text"}
            aria-label="Create an annotation"
            variant="neutral"
            size="small"
            look="outlined"
            tooltip="Create a new annotation"
            onClick={(event) => {
              event.preventDefault();
              onAddNew();
            }}
          >
            <IconPlus />
          </Button>
        )}
        {children}
      </div>
    </div>
  );
}
