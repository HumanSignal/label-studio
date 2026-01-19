import { forwardRef, type KeyboardEvent, type MouseEvent } from "react";
import { IconClose } from "@humansignal/icons";
import { cnm } from "../../utils/utils";
import styles from "./tag-autocomplete.module.scss";

export interface TagProps {
  /** Tag label text */
  label: string;
  /** Callback when remove button is clicked */
  onRemove: () => void;
  /** Whether the tag is currently focused */
  isFocused?: boolean;
  /** Whether the tag is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Tab index for keyboard navigation */
  tabIndex?: number;
  /** Keyboard event handler */
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  /** Test ID */
  dataTestid?: string;
}

export const Tag = forwardRef<HTMLDivElement, TagProps>(
  ({ label, onRemove, isFocused, disabled, className, tabIndex = -1, onKeyDown, dataTestid }, ref) => {
    const handleRemoveClick = (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        onRemove();
      }
    };

    return (
      <div
        ref={ref}
        tabIndex={disabled ? -1 : tabIndex}
        className={cnm(
          styles.tag,
          {
            [styles.tagFocused]: isFocused,
            [styles.tagDisabled]: disabled,
          },
          className,
        )}
        onKeyDown={onKeyDown}
        data-testid={dataTestid ?? `tag-${label}`}
        aria-label={`${label}, press Delete or Backspace to remove`}
      >
        <span className={styles.tagLabel}>{label}</span>
        <button
          type="button"
          className={styles.tagRemove}
          onClick={handleRemoveClick}
          disabled={disabled}
          tabIndex={-1}
          aria-label={`Remove ${label}`}
        >
          <IconClose className={styles.tagRemoveIcon} />
        </button>
      </div>
    );
  },
);

Tag.displayName = "Tag";
