/**
 * CellOverlay - Overlay component for displaying table cells on PDF
 *
 * Provides:
 * - Visual cell boundaries
 * - Cell text display
 * - Cell selection highlighting
 * - Click to select cell
 * - Double-click to edit cell
 */

import React, { useCallback, useMemo, memo } from 'react';
import { observer } from 'mobx-react';

import { CellEditor } from './CellEditor';
import styles from './CellOverlay.module.scss';

/**
 * Single cell component
 */
const Cell = memo(({
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
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    onSelect?.(cell);
  }, [cell, onSelect]);

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    onStartEdit?.(cell);
  }, [cell, onStartEdit]);

  const handleConfirmEdit = useCallback((newText) => {
    onConfirmEdit?.(cell, newText);
  }, [cell, onConfirmEdit]);

  const handleCancelEdit = useCallback(() => {
    onCancelEdit?.(cell);
  }, [cell, onCancelEdit]);

  const cellStyle = useMemo(() => ({
    left: `${cell.x}%`,
    top: `${cell.y}%`,
    width: `${cell.width}%`,
    height: `${cell.height}%`,
  }), [cell.x, cell.y, cell.width, cell.height]);

  const className = [
    styles.cell,
    'lsf-table-editor__cell',
    isSelected && styles.selected,
    isSelected && 'selected',
    isHighlighted && styles.highlighted,
    isHighlighted && 'highlighted',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={className}
      style={cellStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-cell-row={cell.row}
      data-cell-col={cell.col}
      tabIndex={isSelected ? 0 : -1}
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
    </div>
  );
});

Cell.displayName = 'Cell';

/**
 * CellOverlay component - displays all cells in a table
 */
const CellOverlay = observer(({
  region,
  tokens,
  selectedCell,
  editingCell,
  highlightedCell,
  onSelectCell,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
  initialCharacter,
  visible = true,
}) => {
  // Get cells from region
  const cells = useMemo(() => {
    if (!region || !region.isTable) return [];
    return region.cells || [];
  }, [region, region?.isTable, region?.cells]);

  // Extract text for each cell from OCR tokens
  const cellTexts = useMemo(() => {
    if (!cells.length || !tokens || !tokens.length) {
      return {};
    }

    const texts = {};

    cells.forEach((cell) => {
      // Calculate absolute cell coordinates on page
      const cellAbsX = region.x + (cell.x / 100) * region.width;
      const cellAbsY = region.y + (cell.y / 100) * region.height;
      const cellAbsW = (cell.width / 100) * region.width;
      const cellAbsH = (cell.height / 100) * region.height;

      // Find tokens whose center is within the cell
      const cellTokens = tokens.filter((token) => {
        const [tx, ty, tw, th] = token.bbox;
        const tokenX = tx * 100;
        const tokenY = ty * 100;
        const tokenW = tw * 100;
        const tokenH = th * 100;

        const tokenCenterX = tokenX + tokenW / 2;
        const tokenCenterY = tokenY + tokenH / 2;

        return (
          tokenCenterX >= cellAbsX &&
          tokenCenterX <= cellAbsX + cellAbsW &&
          tokenCenterY >= cellAbsY &&
          tokenCenterY <= cellAbsY + cellAbsH
        );
      });

      // Sort by reading order (top to bottom, left to right)
      cellTokens.sort((a, b) => {
        const [ax, ay] = a.bbox;
        const [bx, by] = b.bbox;
        const yDiff = ay - by;
        if (Math.abs(yDiff) > 0.01) return yDiff;
        return ax - bx;
      });

      texts[`${cell.row}-${cell.col}`] = cellTokens.map((t) => t.text).join(' ');
    });

    return texts;
  }, [cells, tokens, region]);

  // Check if a cell is selected
  const isCellSelected = useCallback(
    (cell) => {
      return selectedCell && selectedCell.row === cell.row && selectedCell.col === cell.col;
    },
    [selectedCell]
  );

  // Check if a cell is being edited
  const isCellEditing = useCallback(
    (cell) => {
      return editingCell && editingCell.row === cell.row && editingCell.col === cell.col;
    },
    [editingCell]
  );

  // Check if a cell is highlighted
  const isCellHighlighted = useCallback(
    (cell) => {
      return highlightedCell && highlightedCell.row === cell.row && highlightedCell.col === cell.col;
    },
    [highlightedCell]
  );

  if (!visible || cells.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.cellOverlay} lsf-table-editor__cell-overlay`}>
      {cells.map((cell) => {
        const cellKey = `${cell.row}-${cell.col}`;
        return (
          <Cell
            key={cellKey}
            cell={cell}
            text={cellTexts[cellKey] || ''}
            isSelected={isCellSelected(cell)}
            isEditing={isCellEditing(cell)}
            isHighlighted={isCellHighlighted(cell)}
            onSelect={onSelectCell}
            onStartEdit={onStartEdit}
            onConfirmEdit={onConfirmEdit}
            onCancelEdit={onCancelEdit}
            initialCharacter={isCellEditing(cell) ? initialCharacter : null}
          />
        );
      })}
    </div>
  );
});

CellOverlay.displayName = 'CellOverlay';

export { CellOverlay, Cell };
export default CellOverlay;
