import { IconClose } from "@humansignal/icons";
import type { KeyboardEvent, MouseEvent } from "react";
import { cnm } from "../../utils/utils";
import { Tooltip } from "../Tooltip/Tooltip";
import styles from "./filter-pill.module.css";
import type { FilterShellItem } from "./types";

export const FilterPill = ({ id, label, pinned, active, control, controlId, onRemove }: FilterShellItem) => {
  const activateControl = () => {
    const controlElement = document.getElementById(controlId);
    controlElement?.focus();
    controlElement?.click();
  };

  const handleLabelClick = (event: MouseEvent<HTMLLabelElement>) => {
    event.preventDefault();
    activateControl();
  };

  const handleLabelKeyDown = (event: KeyboardEvent<HTMLLabelElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    activateControl();
  };

  return (
    <div className={styles.pill} data-active={active ? "true" : undefined} data-testid={`filter-shell-pill-${id}`}>
      <div className={cnm(styles.name, !pinned && styles.nameWithRemove)}>
        {!pinned && (
          <Tooltip title="Remove filter">
            <button
              type="button"
              className={styles.remove}
              aria-label={`Remove ${label} filter`}
              data-testid={`filter-shell-${id}-remove`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRemove?.();
              }}
            >
              <IconClose aria-hidden="true" />
            </button>
          </Tooltip>
        )}
        <Tooltip title={label}>
          <label
            className={styles.label}
            htmlFor={controlId}
            // Keep label out of Tab order (Remove → value); still keyboard-activatable when focused.
            tabIndex={-1}
            onClick={handleLabelClick}
            onKeyDown={handleLabelKeyDown}
          >
            {label}
          </label>
        </Tooltip>
      </div>
      <div className={styles.control}>{control}</div>
    </div>
  );
};
