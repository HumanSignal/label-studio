/**
 * SpreadsheetPanel - Spreadsheet-like panel for table cell editing
 *
 * Provides:
 * - Grid view of all cells
 * - Keyboard navigation
 * - Cell text editing
 * - Sync with PDF cell overlay
 */

import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { observer } from 'mobx-react';

import { useKeyboardNav } from './KeyboardNav';
import { CellEditor } from './CellEditor';
import styles from './SpreadsheetPanel.module.scss';

/**
 * Spreadsheet cell component
 */
const SpreadsheetCell = memo(({
  cell,
  text,
  isSelected,
  isEditing,
  isHighlighted,
  onSelect,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
  initialCharacter,
}) => {
  const handleClick = useCallback(() => {
    onSelect?.(cell);
  }, [cell, onSelect]);

  const handleDoubleClick = useCallback(() => {
    onStartEdit?.(cell);
  }, [cell, onStartEdit]);

  const handleConfirmEdit = useCallback((newText) => {
    onConfirmEdit?.(cell, newText);
  }, [cell, onConfirmEdit]);

  const handleCancelEdit = useCallback(() => {
    onCancelEdit?.(cell);
  }, [cell, onCancelEdit]);

  const className = [
    styles.cell,
    'lsf-table-editor__spreadsheet-cell',
    isSelected && styles.selected,
    isHighlighted && styles.highlighted,
  ].filter(Boolean).join(' ');

  return (
    <td
      className={className}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-cell-row={cell.row}
      data-cell-col={cell.col}
    >
      {isEditing ? (
        <CellEditor
          value={text}
          onConfirm={handleConfirmEdit}
          onCancel={handleCancelEdit}
          initialCharacter={initialCharacter}
        />
      ) : (
        <span className={styles.cellText}>{text}</span>
      )}
    </td>
  );
});

SpreadsheetCell.displayName = 'SpreadsheetCell';

/**
 * SpreadsheetPanel component
 */
const SpreadsheetPanel = observer(({
  region,
  tokens,
  cellTexts,
  onCellTextChange,
  onCellSelect,
  onCellHighlight,
  selectedCell: externalSelectedCell,
  className,
}) => {
  const containerRef = useRef(null);

  // Internal state for cell selection and editing
  const [selectedCell, setSelectedCell] = useState(externalSelectedCell || null);
  const [editingCell, setEditingCell] = useState(null);
  const [highlightedCell, setHighlightedCell] = useState(null);
  const [initialCharacter, setInitialCharacter] = useState(null);

  // Sync external selection
  useEffect(() => {
    if (externalSelectedCell) {
      setSelectedCell(externalSelectedCell);
    }
  }, [externalSelectedCell]);

  // Get cells from region
  const cells = useMemo(() => {
    if (!region || !region.isTable) return [];
    return region.cells || [];
  }, [region, region?.isTable, region?.cells]);

  // Build 2D array for grid rendering
  const grid = useMemo(() => {
    if (!cells.length) return [];

    const numRows = region?.numRows || 0;
    const numCols = region?.numCols || 0;
    const gridArray = [];

    for (let r = 0; r < numRows; r++) {
      const row = [];
      for (let c = 0; c < numCols; c++) {
        const cell = cells.find((cell) => cell.row === r && cell.col === c);
        row.push(cell || { row: r, col: c, x: 0, y: 0, width: 0, height: 0 });
      }
      gridArray.push(row);
    }

    return gridArray;
  }, [cells, region?.numRows, region?.numCols]);

  // Get text for a cell
  const getCellText = useCallback(
    (cell) => {
      if (!cell) return '';
      const key = `${cell.row}-${cell.col}`;
      return cellTexts?.[key] || '';
    },
    [cellTexts]
  );

  // Handle cell selection
  const handleSelectCell = useCallback(
    (cell) => {
      setSelectedCell(cell);
      setEditingCell(null);
      setInitialCharacter(null);
      onCellSelect?.(cell);
    },
    [onCellSelect]
  );

  // Handle start editing
  const handleStartEdit = useCallback((cell, initialChar = null) => {
    setEditingCell(cell);
    setInitialCharacter(initialChar);
  }, []);

  // Handle confirm edit
  const handleConfirmEdit = useCallback(
    (cell, newText) => {
      setEditingCell(null);
      setInitialCharacter(null);
      onCellTextChange?.(cell, newText);
    },
    [onCellTextChange]
  );

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
    setInitialCharacter(null);
  }, []);

  // Handle cell hover for highlight sync
  const handleCellMouseEnter = useCallback(
    (cell) => {
      setHighlightedCell(cell);
      onCellHighlight?.(cell);
    },
    [onCellHighlight]
  );

  const handleCellMouseLeave = useCallback(() => {
    setHighlightedCell(null);
    onCellHighlight?.(null);
  }, [onCellHighlight]);

  // Keyboard navigation
  const { handleKeyDown } = useKeyboardNav({
    table: { numRows: region?.numRows || 0, numCols: region?.numCols || 0 },
    currentCell: selectedCell || { row: 0, col: 0 },
    isEditing: !!editingCell,
    onNavigate: handleSelectCell,
    onStartEdit: (initialChar) => handleStartEdit(selectedCell, initialChar),
    onConfirmEdit: () => {
      if (editingCell) {
        // Get the current input value from the editor
        const input = containerRef.current?.querySelector('[data-testid="cell-editor-input"]');
        if (input) {
          handleConfirmEdit(editingCell, input.value);
        } else {
          handleCancelEdit();
        }
      }
    },
    onCancelEdit: handleCancelEdit,
  });

  // Focus container for keyboard events
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  if (!region || !region.isTable || grid.length === 0) {
    return (
      <div className={`${styles.empty} ${className || ''}`}>
        <p>No table structure defined</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.container} lsf-table-editor__spreadsheet ${className || ''}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.header}>
        <span className={styles.title}>
          Table ({region.numRows} rows × {region.numCols} cols)
        </span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.cornerCell}></th>
              {grid[0]?.map((_, colIndex) => (
                <th key={colIndex} className={styles.headerCell}>
                  {String.fromCharCode(65 + colIndex)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className={styles.rowHeader}>{rowIndex + 1}</td>
                {row.map((cell, colIndex) => (
                  <SpreadsheetCell
                    key={`${rowIndex}-${colIndex}`}
                    cell={cell}
                    text={getCellText(cell)}
                    isSelected={selectedCell?.row === rowIndex && selectedCell?.col === colIndex}
                    isEditing={editingCell?.row === rowIndex && editingCell?.col === colIndex}
                    isHighlighted={highlightedCell?.row === rowIndex && highlightedCell?.col === colIndex}
                    onSelect={handleSelectCell}
                    onStartEdit={handleStartEdit}
                    onConfirmEdit={handleConfirmEdit}
                    onCancelEdit={handleCancelEdit}
                    initialCharacter={editingCell?.row === rowIndex && editingCell?.col === colIndex ? initialCharacter : null}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

SpreadsheetPanel.displayName = 'SpreadsheetPanel';

export { SpreadsheetPanel };
export default SpreadsheetPanel;
