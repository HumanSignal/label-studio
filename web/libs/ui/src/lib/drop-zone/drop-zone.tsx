import { type ButtonHTMLAttributes, type ReactNode, forwardRef, useRef, useState } from "react";
import { cnm } from "../../utils/utils";

export interface DropZoneProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onDrop" | "onChange" | "type" | "children"> {
  /** Files dropped on the zone, or picked from the file dialog it opens on click. */
  onFiles: (files: FileList) => void;
  /** Passed to the file dialog, e.g. "image/*,.pdf". */
  accept?: string;
  multiple?: boolean;
  /** Highlights the zone while a drag happens elsewhere, e.g. over the whole page. */
  active?: boolean;
  children: ReactNode;
}

/**
 * A dashed area that takes files by drag and drop or opens the file dialog on click. The content says what to
 * drop ("Drag and drop … or browse"); the zone highlights while files are dragged over it.
 */
export const DropZone = forwardRef<HTMLButtonElement, DropZoneProps>(
  (
    {
      onFiles,
      accept,
      multiple,
      active = false,
      disabled = false,
      className,
      children,
      onClick,
      onDragOver,
      onDragLeave,
      ...rest
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const highlighted = (dragging || active) && !disabled;

    return (
      <>
        <button
          ref={ref}
          type="button"
          data-slot="drop-zone"
          data-state={highlighted ? "active" : "idle"}
          disabled={disabled}
          {...rest}
          onClick={(event) => {
            onClick?.(event);
            if (!event.defaultPrevented) inputRef.current?.click();
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
            onDragOver?.(event);
          }}
          onDragLeave={(event) => {
            setDragging(false);
            onDragLeave?.(event);
          }}
          onDrop={(event) => {
            event.preventDefault();
            // A page that also accepts drops anywhere must not take this drop a second time.
            event.stopPropagation();
            setDragging(false);
            if (!disabled && event.dataTransfer?.files?.length) onFiles(event.dataTransfer.files);
          }}
          className={cnm(
            "w-full cursor-pointer rounded-small border-2 border-dashed p-tight text-center text-sm text-neutral-content-subtler transition-colors",
            highlighted
              ? "border-primary-border bg-primary-background"
              : "border-neutral-border bg-neutral-surface hover:border-primary-border",
            disabled && "cursor-not-allowed opacity-60 hover:border-neutral-border",
            className,
          )}
        >
          {children}
        </button>
        <input
          ref={inputRef}
          type="file"
          hidden
          tabIndex={-1}
          aria-hidden="true"
          accept={accept}
          multiple={multiple}
          data-slot="drop-zone-input"
          onChange={(event) => {
            if (event.target.files?.length) onFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </>
    );
  },
);
DropZone.displayName = "DropZone";
