/**
 * Shared, presentational ViewAllToggle.
 *
 * Pure props in / pure callback out. No MST, no Jotai. Uses BEM via cn() so the
 * generated DOM has `lsf-view-all-toggle*` classes after the PostCSS prefix step,
 * preserving customer whitelabel CSS and Cypress selectors.
 */

import { IconViewAll } from "@humansignal/icons";
import { Typography } from "@humansignal/ui";
import { cnb as cn } from "../utils/bem";
import "./ViewAllToggle.prefix.css";

export interface ViewAllToggleProps {
  isActive: boolean;
  onClick: () => void;
}

export function ViewAllToggle({ isActive, onClick }: ViewAllToggleProps) {
  return (
    <button
      type="button"
      className={cn("view-all-toggle").mod({ selected: isActive }).toClassName()}
      onClick={onClick}
      aria-label="Compare all annotations"
      aria-pressed={isActive}
      data-testid="compare-all-toggle"
    >
      <div className={cn("view-all-toggle").elem("mainSection").toClassName()}>
        <div className={cn("view-all-toggle").elem("iconContainer").toClassName()}>
          <IconViewAll />
        </div>
        <div className={cn("view-all-toggle").elem("content").toClassName()}>
          <Typography variant="label" size="small" className={cn("view-all-toggle").elem("label").toClassName()}>
            Compare All
          </Typography>
        </div>
      </div>
    </button>
  );
}
