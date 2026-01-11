/**
 * PdfRegion - Rectangle region for PDF documents with page support.
 *
 * Extends rectangle region functionality with:
 * - Page number tracking
 * - OCR text extraction
 * - PDF-specific coordinate handling
 */

import { getRoot, isAlive, types } from 'mobx-state-tree';
import { observer } from 'mobx-react';
import { useCallback, useMemo } from 'react';

import Constants from '../../core/Constants';
import { guidGenerator } from '../../core/Helpers';
import Registry from '../../core/Registry';
import { AreaMixin } from '../../mixins/AreaMixin';
import NormalizationMixin from '../../mixins/Normalization';
import RegionsMixin from '../../mixins/Regions';
import { EditableRegion } from '../EditableRegion';
import { PdfOcrModel } from '../../tags/object/PdfOcr';

import styles from './PdfRegion.module.scss';

/**
 * PdfRegion Model - MST model for PDF rectangle regions
 */
const Model = types
  .model('PdfRegionModel', {
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: 'pdfregion',

    // Reference to the parent PdfOcr object tag
    object: types.late(() => types.reference(PdfOcrModel)),

    // Coordinates (0-100 percentage)
    x: types.number,
    y: types.number,
    width: types.number,
    height: types.number,
    rotation: types.optional(types.number, 0),

    // PDF-specific: page number (1-based)
    page: types.optional(types.number, 1),

    // Extracted OCR text
    extractedText: types.maybeNull(types.string),

    // Table structure: gridlines as percentages (0-100)
    row_lines: types.optional(types.array(types.number), []),
    col_lines: types.optional(types.array(types.number), []),

    // Table flag
    isTable: types.optional(types.boolean, false),

    // Cell texts - map of "row-col" -> text
    // Uses MST map type for observable updates
    cellTexts: types.optional(types.map(types.string), {}),
  })
  .volatile(() => ({
    // Visual properties
    opacity: 1,
    fill: true,
    fillColor: '#ff8800',
    fillOpacity: 0.2,
    strokeColor: Constants.STROKE_COLOR,
    strokeWidth: Constants.STROKE_WIDTH,

    // Editing state
    _supportsTransform: true,
    hideable: true,

    editableFields: [
      { property: 'x', label: 'X' },
      { property: 'y', label: 'Y' },
      { property: 'width', label: 'W' },
      { property: 'height', label: 'H' },
      { property: 'page', label: 'Page' },
    ],

    // Table editing state
    tableEditMode: null, // 'row' | 'col' | null
  }))
  .views((self) => ({
    get store() {
      return getRoot(self);
    },

    get parent() {
      return isAlive(self) ? self.object : null;
    },

    /**
     * Check if region is on the currently displayed page
     */
    get isOnCurrentPage() {
      if (!self.parent) return true;
      return self.page === self.parent._currentPage;
    },

    /**
     * Get bounding box coordinates
     */
    get bboxCoords() {
      return {
        left: self.x,
        top: self.y,
        right: self.x + self.width,
        bottom: self.y + self.height,
      };
    },

    /**
     * Convert percentage to canvas coordinates
     */
    get canvasX() {
      if (!self.parent) return self.x;
      return (self.x / 100) * self.parent._pageWidth * self.parent._scale;
    },

    get canvasY() {
      if (!self.parent) return self.y;
      return (self.y / 100) * self.parent._pageHeight * self.parent._scale;
    },

    get canvasWidth() {
      if (!self.parent) return self.width;
      return (self.width / 100) * self.parent._pageWidth * self.parent._scale;
    },

    get canvasHeight() {
      if (!self.parent) return self.height;
      return (self.height / 100) * self.parent._pageHeight * self.parent._scale;
    },

    /**
     * Number of rows in table (gridlines + 1)
     */
    get numRows() {
      return self.row_lines.length + 1;
    },

    /**
     * Number of columns in table (gridlines + 1)
     */
    get numCols() {
      return self.col_lines.length + 1;
    },

    /**
     * Get cells as array of {row, col, x, y, width, height}
     */
    get cells() {
      if (!self.isTable) return [];

      const rows = [0, ...self.row_lines.slice().sort((a, b) => a - b), 100];
      const cols = [0, ...self.col_lines.slice().sort((a, b) => a - b), 100];
      const cells = [];

      for (let r = 0; r < rows.length - 1; r++) {
        for (let c = 0; c < cols.length - 1; c++) {
          cells.push({
            row: r,
            col: c,
            // Relative to table region (0-100)
            x: cols[c],
            y: rows[r],
            width: cols[c + 1] - cols[c],
            height: rows[r + 1] - rows[r],
            // Absolute on page
            absX: self.x + (cols[c] / 100) * self.width,
            absY: self.y + (rows[r] / 100) * self.height,
            absWidth: (cols[c + 1] - cols[c]) / 100 * self.width,
            absHeight: (rows[r + 1] - rows[r]) / 100 * self.height,
          });
        }
      }

      return cells;
    },

    /**
     * Serialize region for annotation result
     */
    serialize() {
      const result = {
        value: {
          x: self.x,
          y: self.y,
          width: self.width,
          height: self.height,
          rotation: self.rotation,
          page: self.page,
        },
      };

      // Include table structure if present
      if (self.isTable) {
        result.value.isTable = true;
        result.value.row_lines = [...self.row_lines];
        result.value.col_lines = [...self.col_lines];

        // Include cell texts if any
        const cellTexts = self.getAllCellTexts();
        if (Object.keys(cellTexts).length > 0) {
          result.value.cellTexts = cellTexts;
        }

        // Build structured cells array with text
        result.value.cells = self.cells.map((cell) => ({
          row: cell.row,
          col: cell.col,
          text: self.getCellText(cell.row, cell.col) || '',
          x: cell.absX,
          y: cell.absY,
          width: cell.absWidth,
          height: cell.absHeight,
        }));
      }

      // Include extracted text if present
      if (self.extractedText) {
        result.value.extractedText = self.extractedText;
      }

      return result;
    },
  }))
  .actions((self) => ({
    /**
     * After create hook
     */
    afterCreate() {
      // Store initial position
      self.startX = self.x;
      self.startY = self.y;
    },

    /**
     * Restore region from saved annotation value
     */
    fromJSON(value) {
      // Restore basic coordinates
      if (value.x !== undefined) self.x = value.x;
      if (value.y !== undefined) self.y = value.y;
      if (value.width !== undefined) self.width = value.width;
      if (value.height !== undefined) self.height = value.height;
      if (value.rotation !== undefined) self.rotation = value.rotation;
      if (value.page !== undefined) self.page = value.page;

      // Restore extracted text
      if (value.extractedText) {
        self.extractedText = value.extractedText;
      }

      // Restore table structure
      if (value.isTable) {
        self.isTable = true;

        if (value.row_lines && Array.isArray(value.row_lines)) {
          self.row_lines.replace(value.row_lines);
        }

        if (value.col_lines && Array.isArray(value.col_lines)) {
          self.col_lines.replace(value.col_lines);
        }

        // Restore cell texts from cellTexts map
        if (value.cellTexts && typeof value.cellTexts === 'object') {
          Object.entries(value.cellTexts).forEach(([key, text]) => {
            self.cellTexts.set(key, text);
          });
        }

        // Alternatively, restore from cells array if cellTexts not present
        if (value.cells && Array.isArray(value.cells) && !value.cellTexts) {
          value.cells.forEach((cell) => {
            if (cell.text) {
              const key = `${cell.row}-${cell.col}`;
              self.cellTexts.set(key, cell.text);
            }
          });
        }
      }
    },

    /**
     * Set region coordinates
     */
    setPosition(x, y, width, height) {
      self.x = Math.max(0, Math.min(100 - width, x));
      self.y = Math.max(0, Math.min(100 - height, y));
      self.width = Math.max(1, Math.min(100 - self.x, width));
      self.height = Math.max(1, Math.min(100 - self.y, height));
    },

    /**
     * Set page number
     */
    setPage(page) {
      self.page = page;
    },

    /**
     * Set extracted text
     */
    setExtractedText(text) {
      self.extractedText = text;
    },

    /**
     * Move region by delta
     */
    move(deltaX, deltaY) {
      const newX = self.x + deltaX;
      const newY = self.y + deltaY;

      self.x = Math.max(0, Math.min(100 - self.width, newX));
      self.y = Math.max(0, Math.min(100 - self.height, newY));
    },

    /**
     * Resize region
     */
    resize(width, height) {
      self.width = Math.max(1, Math.min(100 - self.x, width));
      self.height = Math.max(1, Math.min(100 - self.y, height));
    },

    /**
     * Update from drawing operation
     */
    updateFromDraw(startX, startY, endX, endY) {
      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      self.setPosition(x, y, width, height);
    },

    /**
     * Mark region as a table
     */
    setIsTable(isTable) {
      self.isTable = isTable;
    },

    /**
     * Set row gridlines (percentages 0-100 relative to region)
     */
    setRowLines(lines) {
      self.row_lines.replace(lines.slice().sort((a, b) => a - b));
    },

    /**
     * Set column gridlines (percentages 0-100 relative to region)
     */
    setColLines(lines) {
      self.col_lines.replace(lines.slice().sort((a, b) => a - b));
    },

    /**
     * Add a row gridline at position (0-100)
     */
    addRowLine(position) {
      if (position > 0 && position < 100) {
        const newLines = [...self.row_lines, position].sort((a, b) => a - b);
        self.row_lines.replace(newLines);
      }
    },

    /**
     * Add a column gridline at position (0-100)
     */
    addColLine(position) {
      if (position > 0 && position < 100) {
        const newLines = [...self.col_lines, position].sort((a, b) => a - b);
        self.col_lines.replace(newLines);
      }
    },

    /**
     * Remove a row gridline by index
     */
    removeRowLine(index) {
      if (index >= 0 && index < self.row_lines.length) {
        const newLines = self.row_lines.filter((_, i) => i !== index);
        self.row_lines.replace(newLines);
      }
    },

    /**
     * Remove a column gridline by index
     */
    removeColLine(index) {
      if (index >= 0 && index < self.col_lines.length) {
        const newLines = self.col_lines.filter((_, i) => i !== index);
        self.col_lines.replace(newLines);
      }
    },

    /**
     * Update row gridline position
     */
    updateRowLine(index, position) {
      if (index >= 0 && index < self.row_lines.length && position > 0 && position < 100) {
        const newLines = [...self.row_lines];
        newLines[index] = position;
        self.row_lines.replace(newLines.sort((a, b) => a - b));
      }
    },

    /**
     * Update column gridline position
     */
    updateColLine(index, position) {
      if (index >= 0 && index < self.col_lines.length && position > 0 && position < 100) {
        const newLines = [...self.col_lines];
        newLines[index] = position;
        self.col_lines.replace(newLines.sort((a, b) => a - b));
      }
    },

    /**
     * Clear all gridlines
     */
    clearGridlines() {
      self.row_lines.replace([]);
      self.col_lines.replace([]);
    },

    /**
     * Set table edit mode
     */
    setTableEditMode(mode) {
      self.tableEditMode = mode;
    },

    /**
     * Get text for a specific cell
     */
    getCellText(row, col) {
      const key = `${row}-${col}`;
      return self.cellTexts.get(key) || '';
    },

    /**
     * Set text for a specific cell
     */
    setCellText(row, col, text) {
      const key = `${row}-${col}`;
      if (text === null || text === undefined || text === '') {
        self.cellTexts.delete(key);
      } else {
        self.cellTexts.set(key, text);
      }
    },

    /**
     * Get all cell texts as a plain object
     */
    getAllCellTexts() {
      const result = {};
      self.cellTexts.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    },

    /**
     * Clear all cell texts
     */
    clearCellTexts() {
      self.cellTexts.clear();
    },
  }));

/**
 * Compose region model with mixins
 */
const PdfRegionModel = types.compose(
  'PdfRegionModel',
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  EditableRegion,
  Model
);

/**
 * TableGridlines Component - renders gridlines within a table region
 */
const TableGridlines = observer(({ region }) => {
  if (!region.isTable) return null;

  const rowLines = region.row_lines || [];
  const colLines = region.col_lines || [];

  return (
    <div className={styles.tableGridlines}>
      {/* Horizontal gridlines (row separators) */}
      {rowLines.map((pos, index) => (
        <div
          key={`row-${index}`}
          className={`${styles.gridline} ${styles.gridlineHorizontal}`}
          style={{ top: `${pos}%` }}
          data-line-type="row"
          data-line-index={index}
        />
      ))}

      {/* Vertical gridlines (column separators) */}
      {colLines.map((pos, index) => (
        <div
          key={`col-${index}`}
          className={`${styles.gridline} ${styles.gridlineVertical}`}
          style={{ left: `${pos}%` }}
          data-line-type="col"
          data-line-index={index}
        />
      ))}

      {/* Cell indicators */}
      {region.cells.map((cell) => (
        <div
          key={`cell-${cell.row}-${cell.col}`}
          className={styles.cellIndicator}
          style={{
            left: `${cell.x}%`,
            top: `${cell.y}%`,
            width: `${cell.width}%`,
            height: `${cell.height}%`,
          }}
          data-cell-row={cell.row}
          data-cell-col={cell.col}
        >
          <span className={styles.cellLabel}>
            {cell.row + 1},{cell.col + 1}
          </span>
        </div>
      ))}
    </div>
  );
});

/**
 * PdfRegion React Component - Visual representation of region
 */
const HtxPdfRegion = observer(({ item }) => {
  const isSelected = item.selected;
  const isOnCurrentPage = item.isOnCurrentPage;

  // Don't render if not on current page
  if (!isOnCurrentPage) {
    return null;
  }

  const style = useMemo(() => ({
    left: `${item.x}%`,
    top: `${item.y}%`,
    width: `${item.width}%`,
    height: `${item.height}%`,
    transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
    backgroundColor: item.highlighted
      ? Constants.HIGHLIGHTED_FILL_COLOR
      : `${item.getOneColor()}${Math.round(item.fillOpacity * 255).toString(16).padStart(2, '0')}`,
    borderColor: item.strokeColor,
    borderWidth: `${item.strokeWidth}px`,
    opacity: item.hidden ? 0 : item.opacity,
  }), [
    item.x, item.y, item.width, item.height,
    item.rotation, item.highlighted, item.fillOpacity,
    item.strokeColor, item.strokeWidth, item.hidden, item.opacity,
  ]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    item.onClickRegion(e);
  }, [item]);

  const handleMouseEnter = useCallback(() => {
    item.setHighlight(true);
  }, [item]);

  const handleMouseLeave = useCallback(() => {
    item.setHighlight(false);
  }, [item]);

  return (
    <div
      className={`${styles.region} lsf-region ${isSelected ? `${styles.selected} lsf-region_selected` : ''} ${item.isTable ? styles.tableRegion : ''}`}
      style={style}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-region-id={item.id}
      data-page={item.page}
      data-is-table={item.isTable}
    >
      {item.showLabel && (
        <div className={styles.label}>
          {item.labeling?.selectedLabels?.map((l) => l.value).join(', ')}
          {item.isTable && ` (${item.numRows}×${item.numCols})`}
        </div>
      )}

      {/* Table gridlines */}
      {item.isTable && <TableGridlines region={item} />}

      {isSelected && !item.isTable && (
        <>
          <div className={`${styles.handle} ${styles.handleNW}`} />
          <div className={`${styles.handle} ${styles.handleNE}`} />
          <div className={`${styles.handle} ${styles.handleSW}`} />
          <div className={`${styles.handle} ${styles.handleSE}`} />
        </>
      )}
    </div>
  );
});

// Detector function helps MST union determine when to use PdfRegionModel
const detectPdfRegion = (value) => {
  // PDF regions have page number and percentage-based coordinates
  return value && (
    value.page !== undefined ||
    (typeof value.x === 'number' && typeof value.y === 'number')
  );
};

// Register the region
Registry.addTag('pdfregion', PdfRegionModel, HtxPdfRegion);
Registry.addRegionType(PdfRegionModel, 'pdfocr', detectPdfRegion);

export { PdfRegionModel, HtxPdfRegion };
export default PdfRegionModel;
