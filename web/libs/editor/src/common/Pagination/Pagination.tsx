import React, {
  ChangeEvent,
  FC,
  forwardRef,
  KeyboardEvent,
  useCallback,
  useState
} from 'react';
import { Hotkey } from '../../core/Hotkey';
import { useHotkey } from '../../hooks/useHotkey';
import { Block, Elem } from '../../utils/bem';
import './Pagination.styl';

interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  pageSizeOptions?: [];
  pageSizeSelectable: boolean;
  outline?: boolean;
  align?: 'left' | 'right';
  size?: 'small' | 'medium' | 'large';
  noPadding?: boolean;
  hotkey?: {
    prev?: string,
    next?: string,
  };
  onChange?: (pageNumber: number, maxPerPage?: number | string) => void;
}

const isSystemEvent = (e: KeyboardEvent<HTMLInputElement>): boolean => {
  return (
    (e.code.match(/arrow/i) !== null) ||
    (e.shiftKey && e.code.match(/arrow/i) !== null) ||
    (e.metaKey || e.ctrlKey || e.code === 'Backspace')
  );
};

export const Pagination: FC<PaginationProps> = forwardRef<any, PaginationProps>(({
  size = 'medium',
  pageSizeOptions = [1, 25, 50, 100],
  currentPage,
  pageSize,
  totalPages,
  outline = true,
  align = 'right',
  noPadding = false,
  pageSizeSelectable = true,
  hotkey,
  onChange,
}) => {
  const [inputMode, setInputMode] = useState(false);

  const handleChangeSelect = (e:ChangeEvent<HTMLSelectElement>) => {
    onChange?.(1, e.currentTarget.value);
  };

  const renderOptions = () => {
    return pageSizeOptions.map((obj: number, index: number) => {
      return <option value={obj} key={index}>{obj} per page</option>;
    });
  };

  return (
    <Block name="pagination" mod={{ size, outline, align, noPadding }}>
      <Elem name="navigation">
        <>
          <NavigationButton
            mod={['arrow-left', 'arrow-left-double']}
            onClick={() => onChange?.(1)}
            disabled={currentPage === 1}
          />
          <Elem name="divider" />
        </>
        <NavigationButton
          mod={['arrow-left']}
          onClick={() => onChange?.(currentPage - 1)}
          hotkey={hotkey?.prev}
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
                const _value = parseFloat(e.currentTarget.value);

                if (e.code === 'Escape') {
                  setInputMode(false);
                } else if (e.code === 'Enter') {
                  if (_value <= totalPages && _value >= 1) {
                    onChange?.(_value);
                  }

                  setInputMode(false);
                } else if (e.code.match(/[0-9]/) === null && !isSystemEvent(e)) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              onBlur={(e) => {
                const _value = parseFloat(e.currentTarget.value);

                if (_value <= totalPages && _value >= 1) {
                  onChange?.(_value);
                }

                setInputMode(false);
              }}
            />
          ) : (
            <Elem
              name="page-indicator"
              onClick={() => {
                setInputMode(true);
              }}
            >
              {currentPage}{' '}<span>of {totalPages}</span>
              <div onClick={() => { /*  */ }}></div>
            </Elem>
          )}
        </Elem>
        <NavigationButton
          mod={['arrow-right']}
          onClick={() => onChange?.(currentPage + 1)}
          disabled={currentPage === totalPages}
          hotkey={hotkey?.next}
        />
        <>
          <Elem name="divider" />
          <NavigationButton
            mod={['arrow-right', 'arrow-right-double']}
            onClick={() => onChange?.(totalPages)}
            disabled={currentPage === totalPages}
          />
        </>
      </Elem>
      {pageSizeSelectable && (
        <Elem name="page-size">
          <select value={pageSize} onChange={handleChangeSelect}>
            {renderOptions()}
          </select>
        </Elem>
      )}
    </Block>
  );
});

type NavigationButtonProps = {
  onClick: () => void,
  mod: string[],
  disabled?: boolean,
  hotkey?: string,
};

const NavigationButton: FC<NavigationButtonProps> = ({
  mod,
  disabled,
  hotkey,
  onClick,
}) => {
  const buttonMod = Object.fromEntries(mod.map(m => [m, true]));

  const actionHandler = useCallback(() => {
    if (!disabled) onClick();
  }, [disabled, onClick]);

  buttonMod.disabled = disabled === true;

  useHotkey(hotkey, actionHandler);

  return hotkey ? (
    <Hotkey.Tooltip name={hotkey}>
      <Elem name="btn" mod={buttonMod} onClick={actionHandler}/>
    </Hotkey.Tooltip>
  ) : (
    <Elem name="btn" mod={buttonMod} onClick={actionHandler}/>
  );
};
