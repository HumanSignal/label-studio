import {
  type CSSProperties,
  type FC,
  forwardRef,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cn } from "../../utils/bem";
import { clamp, isDefined } from "../../utils/helpers";
import { useValueTracker } from "../Form/Utils";
import { Select } from "@humansignal/ui";
import "./Pagination.scss";
import { useUpdateEffect } from "../../utils/hooks";

interface PaginationProps {
  name?: string;
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  label?: string;
  allowInput?: boolean;
  allowRewind?: boolean;
  disabled?: boolean;
  waiting?: boolean;
  urlParamName?: string;
  pageSizeOptions?: number[];
  size?: "small" | "medium" | "large";
  style?: CSSProperties;
  onInit?: (pageNumber: number, pageSize: number) => void;
  onChange?: (pageNumber: number, pageSize: number) => void;
  onPageLoad?: (pageNumber: number, pageSize: number) => Promise<void>;
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

const getStoredPageSize = (name?: string): number | undefined => {
  const value = localStorage.getItem(`pages:${name}`);

  if (isDefined(value)) {
    return Number.parseInt(value);
  }

  return undefined;
};

const setStoredPageSize = (name: string, pageSize: number) => {
  localStorage.setItem(`pages:${name}`, pageSize.toString());
};

export const Pagination: FC<PaginationProps> = forwardRef(
  (
    { allowInput = true, allowRewind = true, disabled = false, size = "medium", pageSizeOptions = [], ...props },
    ref,
  ) => {
    const [inputMode, setInputMode] = useState(false);
    const [currentPage, setCurrentPage] = useValueTracker(props.page);
    const [waiting, setWaiting] = useValueTracker(props.waiting);
    const [pageSize, setPageSize] = useValueTracker(
      props.pageSize,
      getStoredPageSize(props.name) ?? pageSizeOptions?.[0] ?? 10,
    );

    const totalPages = useMemo(() => {
      return props.totalPages ?? Math.ceil(props.totalItems / pageSize);
    }, [pageSize, props.totalItems, props.totalPages]);

    const visibleItems = useMemo(() => {
      const { totalItems } = props;
      const start = pageSize * currentPage - pageSize + 1;
      const end = start + pageSize - 1;

      return {
        start: clamp(start, 1, totalItems),
        end: clamp(end, 1, totalItems),
      };
    }, [currentPage, totalPages, pageSize, props.totalItems]);

    const handlePageLoad = useCallback(
      async (pageNumber: number, pageSize: number) => {
        if (props.onPageLoad) {
          setWaiting(true);
          await props.onPageLoad(pageNumber, pageSize);
          setWaiting(false);
        }
      },
      [props.onPageLoad],
    );

    const setPageClamped = useCallback(
      (value: number, force = false) => {
        const pageNumber = clamp(value, 1, totalPages);

        if (pageNumber !== currentPage || force === true) {
          setCurrentPage(pageNumber);
          updateURL(pageNumber);
        }
      },
      [totalPages, currentPage, pageSize, handlePageLoad],
    );

    const updateURL = useCallback(
      (
        page: number,
        options: {
          replace?: boolean;
        } = {},
      ) => {
        if (!props.urlParamName) return;

        const urlParams = new URLSearchParams(location.search);

        urlParams.set(props.urlParamName, page.toString());

        const historyArgs: [any, string, string] = [{ page }, "", `${location.pathname}?${urlParams.toString()}`];

        if (options.replace) {
          history.replaceState(...historyArgs);
        } else {
          history.pushState(...historyArgs);
        }
      },
      [props.urlParamName],
    );

    const applyPageNumberFromEvent = (
      e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>,
    ) => {
      const result = Number.parseInt((e.target as HTMLInputElement).value);

      setPageClamped(result);
      setInputMode(false);
    };

    useEffect(() => {
      props.onInit?.(currentPage, pageSize);
      updateURL(currentPage, { replace: true });
    }, []);

    useUpdateEffect(() => {
      if (currentPage > totalPages) {
        setPageClamped(1, true);
      } else {
        props.onChange?.(currentPage, pageSize);

        handlePageLoad(currentPage, pageSize);
      }
    }, [pageSize, totalPages]);

    useUpdateEffect(() => {
      props.onChange?.(currentPage, pageSize);

      handlePageLoad(currentPage, pageSize);
    }, [currentPage]);

    useEffect(() => {
      const popStateHandler = () => {
        if (!props.urlParamName) return;

        const urlParams = new URLSearchParams(location.search);
        const pageNumberFromURL = Number.parseInt(urlParams.get(props.urlParamName) ?? "");

        if (!isNaN(pageNumberFromURL) && pageNumberFromURL !== currentPage) {
          setCurrentPage(pageNumberFromURL);
        }
      };

      window.addEventListener("popstate", popStateHandler);

      return () => window.removeEventListener("popstate", popStateHandler);
    }, [props.urlParamName]);

    return totalPages > 1 ? (
      <div className={cn("pagination-ls").mod({ disabled, size, waiting }).toClassName()} style={props.style}>
        {props.label && isDefined(pageSize) && (
          <div className={cn("pagination-ls").elem("label").toClassName()}>
            {props.label}: {visibleItems.start}-{visibleItems.end}
          </div>
        )}
        <div className={cn("pagination-ls").elem("navigation").toClassName()}>
          {allowRewind && (
            <>
              <NavigationButton
                mod={["arrow-left", "arrow-left-double"]}
                onClick={() => setPageClamped(1)}
                disabled={currentPage === 1}
              />
              <div className={cn("pagination-ls").elem("divider").toClassName()} />
            </>
          )}
          <NavigationButton
            mod={["arrow-left"]}
            onClick={() => setPageClamped(currentPage - 1)}
            disabled={currentPage === 1}
          />
          <div className={cn("pagination-ls").elem("input").toClassName()}>
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
                    applyPageNumberFromEvent(e);
                  } else if (e.code.match(/[0-9]/) === null && !isSystemEvent(e)) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onBlur={(e) => {
                  applyPageNumberFromEvent(e);
                }}
              />
            ) : (
              <div
                className={cn("pagination-ls").elem("page-indicator").toClassName()}
                onClick={() => {
                  if (allowInput) setInputMode(true);
                }}
              >
                {currentPage} <span>of {totalPages}</span>
                <div
                  onClick={() => {
                    /*  */
                  }}
                />
              </div>
            )}
          </div>
          <NavigationButton
            mod={["arrow-right"]}
            onClick={() => setPageClamped(currentPage + 1)}
            disabled={currentPage === totalPages}
          />
          {allowRewind && (
            <>
              <div className={cn("pagination-ls").elem("divider").toClassName()} />
              <NavigationButton
                mod={["arrow-right", "arrow-right-double"]}
                onClick={() => setPageClamped(totalPages)}
                disabled={currentPage === totalPages}
              />
            </>
          )}
        </div>

        {pageSizeOptions?.length > 0 && (
          <div className={cn("pagination-ls").elem("page-size").toClassName()}>
            <Select
              value={pageSize}
              options={pageSizeOptions.map((v) => ({ label: `${v} per page`, value: v }))}
              onChange={(val: string) => {
                const newPageSize = Number.parseInt(val);

                setPageSize(newPageSize);

                if (props.name) {
                  setStoredPageSize(props.name, newPageSize);
                }
              }}
            />
          </div>
        )}
      </div>
    ) : null;
  },
);

const NavigationButton: FC<{
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  mod: string[];
  disabled?: boolean;
}> = (props) => {
  const mod = Object.fromEntries(props.mod.map((m) => [m, true]));

  mod.disabled = props.disabled === true;

  return <div className={cn("pagination-ls").elem("btn").mod(mod).toClassName()} onClick={props.onClick} />;
};

export const usePage = (paramName: string, initialValue = 1) => {
  const params = new URLSearchParams(location.search);
  const urlValue = params.get(paramName);

  const [page, setPage] = useState(urlValue ? Number.parseInt(urlValue) : initialValue);

  return [page, setPage];
};

export const usePageSize = (paramName: string, initialValue = 1) => {
  const params = new URLSearchParams(location.search);
  const urlValue = params.get(paramName);

  const [pageSize, setPageSize] = useState(urlValue ? Number.parseInt(urlValue) : initialValue);

  return [pageSize, setPageSize];
};
