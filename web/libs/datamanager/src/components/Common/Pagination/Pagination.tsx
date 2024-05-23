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
import { Block, Elem } from "../../../utils/bem";
import { clamp, isDefined } from "../../../utils/helpers";
import { useValueTracker } from "../Form/Utils";
import "./Pagination.styl";
import { useUpdateEffect } from "../../../hooks/useUpdateEffect";
import { Select } from "../Form/Elements";

interface PaginationProps {
  name?: string | (() => string);
  page: number;
  totalPages: number;
  pageSize: number;
  defaultPageSize?: number;
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
  alwaysVisible?: boolean;
  showTitle?: boolean;
  showPageSize?: boolean;
  onInit?: (pageNumber: number, pageSize: number) => void;
  onChange?: (pageNumber: number, pageSize: number) => void;
  onPageLoad?: (pageNumber: number, pageSize: number) => Promise<void>;
}

export const DEFAULT_PAGE_SIZE = 30;

const isSystemEvent = (e: KeyboardEvent<HTMLInputElement>): boolean => {
  return (
    e.code.match(/arrow/i) !== null ||
    (e.shiftKey && e.code.match(/arrow/i) !== null) ||
    e.metaKey ||
    e.ctrlKey ||
    e.code === "Backspace"
  );
};

export const getStoredPageSize = (name?: string, defaultValue?: number): number | undefined => {
  const value = localStorage.getItem(`pages:${name}`);

  if (isDefined(value)) {
    return Number.parseInt(value);
  }

  return defaultValue ?? undefined;
};

export const setStoredPageSize = (name: string, pageSize: number) => {
  localStorage.setItem(`pages:${name}`, pageSize.toString());
};

export const Pagination: FC<PaginationProps> = forwardRef<any, PaginationProps>(
  (
    {
      allowInput = true,
      allowRewind = true,
      disabled = false,
      size = "medium",
      pageSizeOptions = [],
      alwaysVisible = false,
      defaultPageSize,
      showTitle = true,
      showPageSize = true,
      ...props
    },
    ref,
  ) => {
    const [inputMode, setInputMode] = useState(false);
    const [currentPage, setCurrentPage] = useValueTracker(props.page);
    const [waiting, setWaiting] = useValueTracker(props.waiting);

    const finalName = useMemo(() => {
      if (props.name instanceof Function) {
        return props.name();
      }

      return props.name;
    }, [props.name]);

    const [pageSize, setPageSize] = useValueTracker(
      props.pageSize,
      getStoredPageSize(finalName) ?? defaultPageSize ?? pageSizeOptions?.[0] ?? 10,
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
      if (finalName) setStoredPageSize(finalName, pageSize);
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

    useEffect(() => {
      if (ref instanceof Function) {
        ref({});
      } else if (ref) {
        ref.current = {};
      }
    }, []);

    return totalPages > 1 || alwaysVisible ? (
      <Block name="pagination" mod={{ disabled, size, waiting }} style={props.style}>
        {props.label && isDefined(pageSize) && showTitle && (
          <Elem name="label">
            {props.label}: {visibleItems.start}-{visibleItems.end}
          </Elem>
        )}
        <Elem name="navigation">
          {allowRewind && (
            <>
              <NavigationButton
                mod={["arrow-left", "arrow-left-double"]}
                onClick={() => setPageClamped(1)}
                disabled={currentPage === 1}
              />
              <Elem name="divider" />
            </>
          )}
          <NavigationButton
            mod={["arrow-left"]}
            onClick={() => setPageClamped(currentPage - 1)}
            disabled={currentPage === 1}
          />
          <Elem name="input">
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
              <Elem
                name="page-indicator"
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
              </Elem>
            )}
          </Elem>
          <NavigationButton
            mod={["arrow-right"]}
            onClick={() => setPageClamped(currentPage + 1)}
            disabled={currentPage === totalPages}
          />
          {allowRewind && (
            <>
              <Elem name="divider" />
              <NavigationButton
                mod={["arrow-right", "arrow-right-double"]}
                onClick={() => setPageClamped(totalPages)}
                disabled={currentPage === totalPages}
              />
            </>
          )}
        </Elem>

        {pageSizeOptions?.length > 0 && showPageSize && (
          <Elem name="page-size">
            <Select
              size={size}
              value={pageSize}
              options={pageSizeOptions.map((v) => ({ label: `${v} per page`, value: v }))}
              onChange={(e: any) => {
                const newPageSize = Number.parseInt(e.target.value);

                setPageSize(newPageSize);

                if (finalName) {
                  setStoredPageSize(finalName, newPageSize);
                }
              }}
            />
          </Elem>
        )}
      </Block>
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

  return <Elem name="btn" mod={mod} onClick={props.onClick} />;
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
