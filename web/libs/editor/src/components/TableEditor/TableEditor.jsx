/**
 * TableEditor Component - Gridline editor for table structure annotation.
 *
 * Provides:
 * - Add/remove horizontal gridlines (row separators)
 * - Add/remove vertical gridlines (column separators)
 * - Drag gridlines to adjust positions
 * - Visual cell preview
 * - Auto-detect gridlines from OCR tokens
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import { observer } from 'mobx-react';

import styles from './TableEditor.module.scss';

/**
 * Gridline component - single draggable line
 */
const Gridline = memo(({
  position,
  orientation,
  onDrag,
  onDelete,
  tableWidth,
  tableHeight,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e) => {
    e.stopPropagation();
    setIsDragging(true);

    const handleMouseMove = (moveEvent) => {
      const rect = e.target.parentElement.getBoundingClientRect();
      let newPos;

      if (orientation === 'horizontal') {
        newPos = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      } else {
        newPos = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      }

      // Clamp to valid range
      newPos = Math.max(1, Math.min(99, newPos));
      onDrag?.(newPos);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [orientation, onDrag]);

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    onDelete?.();
  }, [onDelete]);

  const style = orientation === 'horizontal'
    ? { top: `${position}%`, left: 0, right: 0 }
    : { left: `${position}%`, top: 0, bottom: 0 };

  return (
    <div
      className={`${styles.gridline} ${styles[`gridline${orientation.charAt(0).toUpperCase() + orientation.slice(1)}`]} lsf-table-editor__gridline--${orientation} ${isDragging ? styles.dragging : ''}`}
      style={style}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      title="Drag to move, double-click to delete"
    />
  );
});

Gridline.displayName = 'Gridline';

/**
 * Cell preview component - shows cell boundaries
 */
const CellPreview = memo(({ rowLines, colLines, tableWidth, tableHeight }) => {
  // Add boundaries (0 and 100)
  const rows = [0, ...rowLines.sort((a, b) => a - b), 100];
  const cols = [0, ...colLines.sort((a, b) => a - b), 100];

  const cells = [];

  for (let r = 0; r < rows.length - 1; r++) {
    for (let c = 0; c < cols.length - 1; c++) {
      cells.push({
        key: `${r}-${c}`,
        top: rows[r],
        left: cols[c],
        height: rows[r + 1] - rows[r],
        width: cols[c + 1] - cols[c],
        row: r,
        col: c,
      });
    }
  }

  return (
    <div className={styles.cellPreview}>
      {cells.map((cell) => (
        <div
          key={cell.key}
          className={`${styles.cell} lsf-table-editor__cell`}
          style={{
            top: `${cell.top}%`,
            left: `${cell.left}%`,
            width: `${cell.width}%`,
            height: `${cell.height}%`,
          }}
          data-row={cell.row}
          data-col={cell.col}
        >
          <span className={styles.cellIndex}>
            {cell.row + 1},{cell.col + 1}
          </span>
        </div>
      ))}
    </div>
  );
});

CellPreview.displayName = 'CellPreview';

/**
 * Toolbar for table editing actions
 */
const TableToolbar = memo(({
  mode,
  onModeChange,
  onAutoDetect,
  onClearAll,
  rowCount,
  colCount,
}) => {
  return (
    <div className={`${styles.toolbar} lsf-table-editor__toolbar`}>
      <div className={styles.toolbarGroup}>
        <button
          className={`${styles.toolButton} ${mode === 'row' ? styles.active : ''}`}
          onClick={() => onModeChange('row')}
          title="Add row lines"
          data-testid="table-add-row"
        >
          ─ Row
        </button>
        <button
          className={`${styles.toolButton} ${mode === 'col' ? styles.active : ''}`}
          onClick={() => onModeChange('col')}
          title="Add column lines"
          data-testid="table-add-col"
        >
          │ Col
        </button>
      </div>

      <div className={styles.toolbarGroup}>
        <button
          className={styles.toolButton}
          onClick={onAutoDetect}
          title="Auto-detect gridlines from text"
          data-testid="table-auto-detect"
        >
          ⚡ Auto
        </button>
        <button
          className={styles.toolButton}
          onClick={onClearAll}
          title="Clear all gridlines"
          data-testid="table-clear"
        >
          ✕ Clear
        </button>
      </div>

      <div className={styles.toolbarInfo}>
        <span>{rowCount + 1} rows</span>
        <span>×</span>
        <span>{colCount + 1} cols</span>
      </div>
    </div>
  );
});

TableToolbar.displayName = 'TableToolbar';

/**
 * Main TableEditor component
 */
const TableEditor = observer(({
  region,
  tokens,
  onRowLinesChange,
  onColLinesChange,
  visible = true,
}) => {
  const [mode, setMode] = useState('row'); // 'row' | 'col' | null
  const [showCellPreview, setShowCellPreview] = useState(true);

  // Get current gridlines from region
  const rowLines = useMemo(() => region?.row_lines || [], [region?.row_lines]);
  const colLines = useMemo(() => region?.col_lines || [], [region?.col_lines]);

  // Handle click to add gridline
  const handleClick = useCallback((e) => {
    if (!mode) return;

    const rect = e.currentTarget.getBoundingClientRect();
    let position;

    if (mode === 'row') {
      position = ((e.clientY - rect.top) / rect.height) * 100;
      position = Math.max(1, Math.min(99, position));

      // Check if too close to existing line
      const tooClose = rowLines.some((line) => Math.abs(line - position) < 2);
      if (!tooClose) {
        onRowLinesChange?.([...rowLines, position].sort((a, b) => a - b));
      }
    } else if (mode === 'col') {
      position = ((e.clientX - rect.left) / rect.width) * 100;
      position = Math.max(1, Math.min(99, position));

      const tooClose = colLines.some((line) => Math.abs(line - position) < 2);
      if (!tooClose) {
        onColLinesChange?.([...colLines, position].sort((a, b) => a - b));
      }
    }
  }, [mode, rowLines, colLines, onRowLinesChange, onColLinesChange]);

  // Handle gridline drag
  const handleRowDrag = useCallback((index, newPos) => {
    const newLines = [...rowLines];
    newLines[index] = newPos;
    onRowLinesChange?.(newLines.sort((a, b) => a - b));
  }, [rowLines, onRowLinesChange]);

  const handleColDrag = useCallback((index, newPos) => {
    const newLines = [...colLines];
    newLines[index] = newPos;
    onColLinesChange?.(newLines.sort((a, b) => a - b));
  }, [colLines, onColLinesChange]);

  // Handle gridline delete
  const handleRowDelete = useCallback((index) => {
    const newLines = rowLines.filter((_, i) => i !== index);
    onRowLinesChange?.(newLines);
  }, [rowLines, onRowLinesChange]);

  const handleColDelete = useCallback((index) => {
    const newLines = colLines.filter((_, i) => i !== index);
    onColLinesChange?.(newLines);
  }, [colLines, onColLinesChange]);

  // Auto-detect gridlines from tokens
  const handleAutoDetect = useCallback(() => {
    if (!tokens || tokens.length === 0) return;

    // Cluster token positions to find row/column lines
    const yPositions = [];
    const xPositions = [];

    tokens.forEach((token) => {
      const [x, y, w, h] = token.bbox;
      // Convert to percentage
      yPositions.push(y * 100);
      yPositions.push((y + h) * 100);
      xPositions.push(x * 100);
      xPositions.push((x + w) * 100);
    });

    // Cluster positions
    const clusterPositions = (positions, threshold = 2) => {
      const sorted = [...new Set(positions)].sort((a, b) => a - b);
      const clustered = [];
      let lastPos = -100;

      sorted.forEach((pos) => {
        if (pos - lastPos > threshold) {
          // Check if this is a gap between tokens
          const gap = positions.filter((p) => Math.abs(p - pos) < threshold).length;
          if (gap > 1) {
            clustered.push(pos);
          }
        }
        lastPos = pos;
      });

      return clustered.filter((p) => p > 5 && p < 95);
    };

    const suggestedRows = clusterPositions(yPositions);
    const suggestedCols = clusterPositions(xPositions);

    if (suggestedRows.length > 0) {
      onRowLinesChange?.(suggestedRows);
    }
    if (suggestedCols.length > 0) {
      onColLinesChange?.(suggestedCols);
    }
  }, [tokens, onRowLinesChange, onColLinesChange]);

  // Clear all gridlines
  const handleClearAll = useCallback(() => {
    onRowLinesChange?.([]);
    onColLinesChange?.([]);
  }, [onRowLinesChange, onColLinesChange]);

  if (!visible) {
    return null;
  }

  return (
    <div className={`${styles.container} lsf-table-editor`}>
      <TableToolbar
        mode={mode}
        onModeChange={setMode}
        onAutoDetect={handleAutoDetect}
        onClearAll={handleClearAll}
        rowCount={rowLines.length}
        colCount={colLines.length}
      />

      <div
        className={styles.gridArea}
        onClick={handleClick}
        style={{ cursor: mode ? 'crosshair' : 'default' }}
      >
        {/* Cell preview */}
        {showCellPreview && (rowLines.length > 0 || colLines.length > 0) && (
          <CellPreview rowLines={rowLines} colLines={colLines} />
        )}

        {/* Horizontal gridlines */}
        {rowLines.map((pos, index) => (
          <Gridline
            key={`row-${index}`}
            position={pos}
            orientation="horizontal"
            onDrag={(newPos) => handleRowDrag(index, newPos)}
            onDelete={() => handleRowDelete(index)}
          />
        ))}

        {/* Vertical gridlines */}
        {colLines.map((pos, index) => (
          <Gridline
            key={`col-${index}`}
            position={pos}
            orientation="vertical"
            onDrag={(newPos) => handleColDrag(index, newPos)}
            onDelete={() => handleColDelete(index)}
          />
        ))}
      </div>
    </div>
  );
});

TableEditor.displayName = 'TableEditor';

export { TableEditor, Gridline, CellPreview, TableToolbar };
export default TableEditor;
