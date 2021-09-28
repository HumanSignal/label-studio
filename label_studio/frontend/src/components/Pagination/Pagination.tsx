import React, { FC, forwardRef, useCallback, useMemo, useState } from "react";
import { Block, Elem } from "../../utils/bem";
import { clamp, isDefined } from "../../utils/helpers";
import { useValueTracker } from "../Form/Utils";
import "./Pagination.styl";

interface PaginationProps {
  page: number,
  totalPages: number,
  itemsPerPage: number,
  totalItems: number,
  label?: string,
  allowInput?: boolean,
  allowRewind?: boolean,
  disabled?: boolean,
  waiting?: boolean,
  size?: "small" | "medium" | "large"
  onChange?: (pageNumber: number) => void
  onPageLoad?: (pageNumber: number) => Promise<void>
}

const isSystemEvent = (e: React.KeyboardEvent<HTMLInputElement>): boolean => {
  return (
    (e.code.match(/arrow/i) !== null) ||
    (e.shiftKey && e.code.match(/arrow/i) !== null) ||
    (e.metaKey || e.ctrlKey || e.code === 'Backspace')
  );
};

export const Pagination: FC<PaginationProps> = forwardRef(({
  allowInput = true,
  allowRewind = true,
  disabled = false,
  size = "medium",
  ...props
}, ref) => {
  const [inputMode, setInputMode] = useState(false);
  const [currentPage, setCurrentPage] = useValueTracker(props.page);
  const [waiting, setWaiting] = useValueTracker(props.waiting);

  const totalPages = useMemo(() => {
    return props.totalPages ?? Math.ceil(props.totalItems / props.itemsPerPage);
  }, [props.itemsPerPage, props.totalItems, props.totalPages]);

  const visibleItems = useMemo(() => {
    const { itemsPerPage, totalItems } = props;
    const start = (itemsPerPage * currentPage - itemsPerPage) + 1;
    const end = start + itemsPerPage - 1;

    return {
      start: clamp(start, 1, totalItems),
      end: clamp(end, 1, totalItems),
    };
  }, [currentPage, totalPages, props.itemsPerPage, props.totalItems]);

  const setPageClamped = useCallback((value: number) => {
    const pageNumber = clamp(value, 1, totalPages);

    if (pageNumber !== currentPage) {
      setCurrentPage(pageNumber);
      props.onChange?.(pageNumber);

      if (props.onPageLoad) {
        setWaiting(true);
        props.onPageLoad(pageNumber).then(() => {
          setWaiting(false);
        });
      }
    }
  }, [totalPages, currentPage]);

  const applyPageNumberFromEvent = (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
    const result = parseInt((e.target as HTMLInputElement).value);

    setPageClamped(result);
    setInputMode(false);
  };

  return (
    <Block name="pagination" mod={{ disabled, size, waiting }}>
      {(props.label && isDefined(props.itemsPerPage)) && (
        <Elem name="label">
          {props.label}: {visibleItems.start}-{visibleItems.end}
        </Elem>
      )}
      <Elem name="navigation">
        {allowRewind && (
          <>
            <NavigationButton
              mod={['arrow-left', 'arrow-left-double']}
              onClick={() => setPageClamped(1)}
              disabled={currentPage === 1}
            />
            <Elem name="divider" />
          </>
        )}
        <NavigationButton
          mod={['arrow-left']}
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
                if (e.code === 'Escape') {
                  setInputMode(false);
                } else if (e.code === 'Enter') {
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
              {currentPage}{" "}<span>of {totalPages}</span>
              <div onClick={() => { /*  */ }}></div>
            </Elem>
          )}
        </Elem>
        <NavigationButton
          mod={['arrow-right']}
          onClick={() => setPageClamped(currentPage + 1)}
          disabled={currentPage === totalPages}
        />
        {allowRewind && (
          <>
            <Elem name="divider" />
            <NavigationButton
              mod={['arrow-right', 'arrow-right-double']}
              onClick={() => setPageClamped(totalPages)}
              disabled={currentPage === totalPages}
            />
          </>
        )}
      </Elem>
    </Block>
  );
});

const NavigationButton: FC<{
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void,
  mod: string[],
  disabled?: boolean,
}> = (props) => {
  const mod = Object.fromEntries(props.mod.map(m => [m, true]));

  mod.disabled = props.disabled === true;

  return (
    <Elem name="btn" mod={mod} onClick={props.onClick}/>
  );
};
