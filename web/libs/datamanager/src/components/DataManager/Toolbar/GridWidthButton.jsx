import { inject } from "mobx-react";
import { useCallback } from "react";
import { Button, Dropdown, Tooltip } from "@humansignal/ui";
import { Counter, Toggle } from "../../Common/Form";
import { SlidersHorizontalIcon } from "@humansignal/icons";

const injector = inject(({ store }) => {
  const view = store?.currentView;

  const cols = view.fieldsAsColumns ?? [];
  const hasImage = cols.some(({ type }) => type === "Image") ?? false;

  return {
    view,
    isGrid: view.type === "grid",
    gridWidth: view?.gridWidth,
    fitImagesToWidth: view?.gridFitImagesToWidth,
    hasImage,
  };
});

export const GridWidthButton = injector(({ view, isGrid, gridWidth, fitImagesToWidth, hasImage, size }) => {
  const isLocked = view?.isLockedByManager;
  const lockedTooltip = view?.lockedUpdateMessage;
  const setGridWidth = useCallback(
    (width) => {
      if (isLocked) return;
      const newWidth = Math.max(1, Math.min(width, 10));

      view.setGridWidth(newWidth);
    },
    [isLocked, view],
  );

  const handleFitImagesToWidthToggle = useCallback(
    (e) => {
      if (isLocked) return;
      view.setFitImagesToWidth(e.target.checked);
    },
    [isLocked, view],
  );

  if (!isGrid) return null;

  const button = (
    <Dropdown.Trigger
      disabled={isLocked}
      content={
        <div className="p-tight min-w-wide space-y-base">
          <div className="grid grid-cols-[1fr_min-content] gap-base items-center">
            <span>Columns</span>
            <Counter
              min={1}
              max={10}
              step={1}
              value={gridWidth}
              increaseAriaLabel="Increase columns number"
              decreaseAriaLabel="Decrease columns number"
              onChange={(e) => setGridWidth(Number(e.target.value))}
            />
          </div>
          {hasImage && (
            <div className="grid grid-cols-[1fr_min-content] gap-base items-center">
              <span>Fit images to width</span>
              <Toggle checked={fitImagesToWidth} onChange={handleFitImagesToWidthToggle} />
            </div>
          )}
        </div>
      }
    >
      <Button
        size={size}
        variant="neutral"
        look="outlined"
        disabled={isLocked}
        aria-label="Grid settings"
        leading={<SlidersHorizontalIcon size={20} />}
        data-testid="dm-grid-width-button"
      />
    </Dropdown.Trigger>
  );

  return isLocked ? <Tooltip title={lockedTooltip}>{button}</Tooltip> : button;
});
