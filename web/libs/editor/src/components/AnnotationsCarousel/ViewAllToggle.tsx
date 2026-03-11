import { observer } from "mobx-react";
import { IconViewAll } from "@humansignal/icons";
import { Typography } from "@humansignal/ui";
import { cn } from "../../utils/bem";
import "./ViewAllToggle.scss";

interface ViewAllToggleProps {
  isActive: boolean;
  onClick: () => void;
}

export const ViewAllToggle = observer(({ isActive, onClick }: ViewAllToggleProps) => {
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
});
