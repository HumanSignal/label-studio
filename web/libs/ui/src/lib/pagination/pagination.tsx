import { type FC, type KeyboardEvent, useCallback, useMemo, useRef, useState } from "react";
import { Select } from "../select/select";
import { cn } from "../../utils/utils";
import styles from "./pagination.module.scss";
import { IconChevronLeft, IconChevronRight, IconFastForward, IconRewind } from "@humansignal/icons";
import { Button } from "../button/button";
import { Typography } from "../typography/typography";

export interface PaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Current page size (items per page) */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Options for page size selector */
  pageSizeOptions?: number[];
  /** Label to display (e.g., "Projects") */
  label?: string;
  /** Whether to allow direct page number input */
  allowInput?: boolean;
  /** Whether to show first/last page buttons */
  allowRewind?: boolean;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Whether to show even when only 1 page */
  alwaysVisible?: boolean;
  /** Whether to show the label with item range */
  showLabel?: boolean;
  /** Whether to show the page size selector */
  showPageSize?: boolean;
  /** Callback when first page is clicked */
  onFirstPage?: () => void;
  /** Callback when previous page is clicked */
  onPreviousPage?: () => void;
  /** Callback when next page is clicked */
  onNextPage?: () => void;
  /** Callback when last page is clicked */
  onLastPage?: () => void;
  /** Callback when page number changes (via input or navigation) */
  onPageChange?: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange?: (pageSize: number) => void;
}

const isSystemEvent = (e: KeyboardEvent<HTMLInputElement>): boolean => {
  return (
    e.code.match(/arrow/i) !== null ||
    (e.shiftKey && e.code.match(/arrow/i) !== null) ||
    e.metaKey ||
    e.ctrlKey ||
    e.code === "Backspace"
  );
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const Pagination: FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 20, 50, 100],
  label,
  allowInput = true,
  allowRewind = true,
  disabled = false,
  alwaysVisible = false,
  showLabel = true,
  showPageSize = true,
  onFirstPage,
  onPreviousPage,
  onNextPage,
  onLastPage,
  onPageChange,
  onPageSizeChange,
}) => {
  const [inputMode, setInputMode] = useState(false);
  const enterPressedRef = useRef(false);

  const visibleItems = useMemo(() => {
    const start = pageSize * currentPage - pageSize + 1;
    const end = Math.min(start + pageSize - 1, totalItems);

    return {
      start: clamp(start, 1, totalItems),
      end: clamp(end, 1, totalItems),
    };
  }, [currentPage, pageSize, totalItems]);

  const handleFirstPage = useCallback(() => {
    if (disabled || currentPage === 1) return;
    // Only call onPageChange - let parent handle the navigation
    // Parent can call onFirstPage if needed for additional logic
    onPageChange?.(1);
    onFirstPage?.();
  }, [disabled, currentPage, onFirstPage, onPageChange]);

  const handlePreviousPage = useCallback(() => {
    if (disabled || currentPage === 1) return;
    const newPage = currentPage - 1;
    // Only call onPageChange - let parent handle the navigation
    onPageChange?.(newPage);
    onPreviousPage?.();
  }, [disabled, currentPage, onPreviousPage, onPageChange]);

  const handleNextPage = useCallback(() => {
    const maxPages = alwaysVisible && totalPages === 0 ? 1 : totalPages;
    if (disabled || currentPage >= maxPages) return;
    const newPage = currentPage + 1;
    // Only call onPageChange - let parent handle the navigation
    onPageChange?.(newPage);
    onNextPage?.();
  }, [disabled, currentPage, totalPages, alwaysVisible, onNextPage, onPageChange]);

  const handleLastPage = useCallback(() => {
    const maxPages = alwaysVisible && totalPages === 0 ? 1 : totalPages;
    if (disabled || currentPage >= maxPages) return;
    // Only call onPageChange - let parent handle the navigation
    onPageChange?.(maxPages);
    onLastPage?.();
  }, [disabled, currentPage, totalPages, alwaysVisible, onLastPage, onPageChange]);

  const applyPageNumberFromEvent = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
      const input = e.target as HTMLInputElement;
      const result = Number.parseInt(input.value);

      // If value is invalid, reset to current page and exit input mode
      if (Number.isNaN(result)) {
        setInputMode(false);
        return;
      }

      const maxPages = alwaysVisible && totalPages === 0 ? 1 : totalPages;
      const clampedPage = clamp(result, 1, maxPages);

      if (clampedPage !== currentPage) {
        onPageChange?.(clampedPage);
      }

      setInputMode(false);
    },
    [currentPage, totalPages, alwaysVisible, onPageChange],
  );

  const handlePageSizeChange = useCallback(
    (option: any) => {
      // Select component can return the option object or just the value
      const newPageSize = typeof option === "object" && option?.value ? option.value : option;
      onPageSizeChange?.(Number(newPageSize));
    },
    [onPageSizeChange],
  );

  const pageSizeSelectOptions = useMemo(() => {
    return pageSizeOptions.map((size) => ({
      value: size,
      label: `${size} per page`,
    }));
  }, [pageSizeOptions]);

  const currentPageSizeOption = useMemo(() => {
    return pageSizeSelectOptions.find((opt) => opt.value === pageSize) || pageSizeSelectOptions[0];
  }, [pageSize, pageSizeSelectOptions]);

  // Don't render if only 1 page and not alwaysVisible
  // Always render if alwaysVisible is true, even with 0 or 1 pages
  if (!alwaysVisible && totalPages <= 1) {
    return null;
  }

  // Ensure we have at least 1 page for display purposes when alwaysVisible is true
  const displayTotalPages = alwaysVisible && totalPages === 0 ? 1 : totalPages;

  return (
    <div className={cn(styles.container, styles["size-medium"], disabled && styles.disabled)}>
      {label && showLabel && (
        <div className={styles.labels}>
          <Typography className="text-neutral-content-subtler">
            {totalItems} {label}
          </Typography>
          <div className={styles["bullet-divider"]}>•</div>
          <Typography className="text-neutral-content-subtler">
            {label}: {visibleItems.start} - {visibleItems.end}
          </Typography>
        </div>
      )}
      <div className={styles.navigation}>
        {allowRewind && (
          <>
            <Button
              variant="neutral"
              look="string"
              className={cn(styles.button, styles["button-first"], currentPage === 1 && styles.disabled)}
              onClick={handleFirstPage}
              disabled={disabled || currentPage === 1}
              aria-label="First page"
            >
              <IconRewind width={24} height={24} />
            </Button>
            <div className={styles.divider} />
          </>
        )}
        <Button
          variant="neutral"
          look="string"
          className={cn(styles.button, styles["button-prev"], currentPage === 1 && styles.disabled)}
          onClick={handlePreviousPage}
          disabled={disabled || currentPage === 1}
          aria-label="Previous page"
        >
          <IconChevronLeft width={24} height={24} />
        </Button>
        <div className={styles.input}>
          {inputMode ? (
            <input
              type="text"
              autoFocus
              defaultValue={currentPage}
              pattern="[0-9]"
              onKeyDown={(e) => {
                if (e.code === "Escape") {
                  setInputMode(false);
                } else if (e.code === "Enter") {
                  e.preventDefault();
                  enterPressedRef.current = true;
                  applyPageNumberFromEvent(e);
                  // Reset flag after a short delay to allow blur to check it
                  setTimeout(() => {
                    enterPressedRef.current = false;
                  }, 0);
                } else if (e.code.match(/[0-9]/) === null && !isSystemEvent(e)) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              onBlur={(e) => {
                // Only apply on blur if Enter wasn't pressed (to avoid double triggers)
                if (!enterPressedRef.current) {
                  applyPageNumberFromEvent(e);
                }
                enterPressedRef.current = false;
              }}
            />
          ) : (
            <div
              className={styles["page-indicator"]}
              onClick={() => {
                if (allowInput && !disabled) setInputMode(true);
              }}
            >
              {currentPage} <span>of {displayTotalPages}</span>
            </div>
          )}
        </div>
        <Button
          variant="neutral"
          look="string"
          className={cn(styles.button, styles["button-next"], currentPage >= displayTotalPages && styles.disabled)}
          onClick={handleNextPage}
          disabled={disabled || currentPage >= displayTotalPages}
          aria-label="Next page"
        >
          <IconChevronRight />
        </Button>
        {allowRewind && (
          <>
            <div className={styles.divider} />
            <Button
              variant="neutral"
              look="string"
              className={cn(styles.button, styles["button-last"], currentPage >= displayTotalPages && styles.disabled)}
              onClick={handleLastPage}
              disabled={disabled || currentPage >= displayTotalPages}
              aria-label="Last page"
            >
              <IconFastForward />
            </Button>
          </>
        )}
      </div>
      {pageSizeOptions.length > 0 && showPageSize && (
        <div className={styles["page-size"]}>
          <Select value={currentPageSizeOption} options={pageSizeSelectOptions} onChange={handlePageSizeChange} />
        </div>
      )}
    </div>
  );
};
