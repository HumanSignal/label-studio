/**
 * Shared, presentational ViewAllToggle.
 *
 * Pure props in / pure callback out. No MST, no Jotai. Uses BEM via cn() so the
 * generated DOM has `lsf-view-all-toggle*` classes after the PostCSS prefix step,
 * preserving customer whitelabel CSS and Cypress selectors.
 */

import { CaretRightIcon, IntersectSquareIcon } from "@humansignal/icons";
import { Typography } from "@humansignal/ui";
import { cnb as cn } from "../utils/bem";
import "./ViewAllToggle.prefix.css";

const DEFAULT_LABEL = "Compare All";
/** Accessible name of the default button; Cypress and the LSF test helpers select on it. */
const DEFAULT_ARIA_LABEL = "Compare all annotations";

export interface ViewAllToggleProps {
  isActive: boolean;
  onClick: () => void;
  variant?: "topbar" | "sidebar";
  /**
   * Visible button text. Editors that open something other than a side-by-side
   * comparison (the shell opens an agreement summary) name it accordingly.
   */
  label?: string;
}

export function ViewAllToggle({ isActive, onClick, variant = "topbar", label = DEFAULT_LABEL }: ViewAllToggleProps) {
  const isSidebar = variant === "sidebar";
  // A renamed button has to carry its own accessible name, or speech input
  // would be left addressing it by a caption that is no longer on screen.
  const ariaLabel = label === DEFAULT_LABEL ? DEFAULT_ARIA_LABEL : label;

  return (
    <button
      type="button"
      className={cn("view-all-toggle").mod({ selected: isActive, sidebar: isSidebar }).toClassName()}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={isActive}
      data-testid="compare-all-toggle"
    >
      <div className={cn("view-all-toggle").elem("mainSection").toClassName()}>
        <div className={cn("view-all-toggle").elem("iconContainer").toClassName()}>
          <IntersectSquareIcon size="20" />
        </div>
        <div className={cn("view-all-toggle").elem("content").toClassName()}>
          <Typography variant="label" size="small" className={cn("view-all-toggle").elem("label").toClassName()}>
            {label}
          </Typography>
        </div>
      </div>
      {isSidebar && <CaretRightIcon size={14} className={cn("view-all-toggle").elem("caret").toClassName()} />}
    </button>
  );
}
