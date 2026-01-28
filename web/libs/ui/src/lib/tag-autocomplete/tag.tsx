import { forwardRef, type KeyboardEvent, type MouseEvent } from "react";
import { IconClose } from "@humansignal/icons";
import { Badge } from "../../shad/components/ui/badge";
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
      <Badge
        ref={ref}
        variant="info"
        shape="squared"
        tabIndex={disabled ? -1 : tabIndex}
        className={cnm(
          "gap-1 max-w-[150px] flex-shrink-0 group focus:ring-0 focus:ring-offset-0",
          {
            [styles.tagFocused]: isFocused,
            "opacity-60 cursor-not-allowed": disabled,
          },
          className,
        )}
        onKeyDown={onKeyDown}
        data-testid={dataTestid ?? `tag-${label}`}
        data-tag="true"
        aria-label={`${label}, press Delete or Backspace to remove`}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
        <button
          type="button"
          className="flex items-center justify-center p-0 m-0 ml-0.5 -mr-1 bg-transparent border-none cursor-pointer opacity-70 rounded-sm transition-all duration-150 hover:opacity-100 hover:bg-primary-emphasis-subtle disabled:cursor-not-allowed disabled:opacity-40 group-hover:opacity-100"
          onClick={handleRemoveClick}
          disabled={disabled}
          tabIndex={-1}
          aria-label={`Remove ${label}`}
        >
          <IconClose className="w-3 h-3" />
        </button>
      </Badge>
    );
  },
);

Tag.displayName = "Tag";
