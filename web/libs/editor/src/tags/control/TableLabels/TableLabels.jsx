/**
 * TableLabels control tag for PDF table structure annotation.
 *
 * Provides:
 * - Table region labeling
 * - Gridline editing (row/column separators)
 * - Cell extraction from OCR tokens
 * - Table structure output with row_lines and col_lines
 */

import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';
import { useCallback, useState } from 'react';

import LabelMixin from '../../../mixins/LabelMixin';
import Registry from '../../../core/Registry';
import SelectedModelMixin from '../../../mixins/SelectedModel';
import Types from '../../../core/Types';
import { HtxLabels, LabelsModel } from '../Labels/Labels';
import { RectangleModel } from '../Rectangle';
import { guidGenerator } from '../../../core/Helpers';
import ControlBase from '../Base';
import { TableEditor } from '../../../components/TableEditor';

import styles from './TableLabels.module.scss';

/**
 * The `TableLabels` tag creates labeled table regions with gridline structure.
 * Use with the PdfOcr object tag to annotate tables with row/column separators.
 *
 * @example
 * <View>
 *   <TableLabels name="tables" toName="pdf">
 *     <Label value="Table" />
 *     <Label value="Figure" />
 *   </TableLabels>
 *   <PdfOcr name="pdf" value="$pdf_url" ocrvalue="$ocr_url" />
 * </View>
 *
 * @name TableLabels
 * @regions PdfRegion
 * @meta_title Table Labels Tag for PDF Table Annotation
 * @meta_description Annotate table structures in PDF documents with gridline editing
 * @param {string} name              - Name of the element
 * @param {string} toName            - Name of the PdfOcr element to label
 * @param {single|multiple=} [choice=single] - Configure label selection mode
 * @param {boolean} [showInline=true] - Show labels inline
 * @param {float} [opacity=0.6]      - Region opacity
 * @param {string} [fillColor]       - Region fill color
 * @param {string} [strokeColor]     - Region stroke color
 * @param {number} [strokeWidth=1]   - Region stroke width
 */

const Validation = types.model({
  controlledTags: Types.unionTag(['PdfOcr']),
});

const ModelAttrs = types.model('TableLabelsModel', {
  pid: types.optional(types.string, guidGenerator),
  type: 'tablelabels',
  children: Types.unionArray(['label', 'header', 'view', 'hypertext']),
});

/**
 * TableLabels-specific functionality
 */
const TableLabelsMixin = types
  .model({
    // Currently editing table region
    _editingTableId: types.maybeNull(types.string),
  })
  .views((self) => ({
    /**
     * Get the PdfOcr object this control is attached to
     */
    get pdfOcrObject() {
      return self.annotation?.names?.get(self.toname);
    },

    /**
     * Get the currently editing table region
     */
    get editingTable() {
      if (!self._editingTableId || !self.annotation) return null;
      return self.annotation.regions.find((r) => r.id === self._editingTableId);
    },

    /**
     * Get all table regions for this control
     */
    get tableRegions() {
      if (!self.annotation) return [];
      return self.annotation.regions.filter((r) => r.isTable && r.type === 'pdfregion');
    },
  }))
  .actions((self) => ({
    /**
     * Set the table region being edited
     */
    setEditingTable(tableId) {
      self._editingTableId = tableId;
    },

    /**
     * Start editing a table region
     */
    startTableEdit(region) {
      if (region && !region.isTable) {
        region.setIsTable(true);
      }
      self._editingTableId = region?.id || null;
    },

    /**
     * Stop editing the current table
     */
    stopTableEdit() {
      self._editingTableId = null;
    },

    /**
     * Create a new table region from coordinates
     */
    createTableRegion(x, y, width, height, page) {
      const region = self.annotation.createResult(
        {
          x,
          y,
          width,
          height,
          rotation: 0,
          page,
          isTable: true,
          row_lines: [],
          col_lines: [],
        },
        self.selectedLabels?.map((l) => l.value) || [],
        self,
        self.pdfOcrObject
      );

      if (region) {
        self.setEditingTable(region.id);
      }

      return region;
    },

    /**
     * Auto-detect gridlines from OCR tokens within a table region
     */
    autoDetectGridlines(region, tokens) {
      if (!region || !tokens || tokens.length === 0) return;

      // Filter tokens within the table region
      const regionTokens = tokens.filter((token) => {
        const [tx, ty, tw, th] = token.bbox;
        const tokenX = tx * 100;
        const tokenY = ty * 100;
        const tokenW = tw * 100;
        const tokenH = th * 100;

        return (
          tokenX >= region.x &&
          tokenX + tokenW <= region.x + region.width &&
          tokenY >= region.y &&
          tokenY + tokenH <= region.y + region.height
        );
      });

      if (regionTokens.length === 0) return;

      // Convert token positions to relative percentages within region
      const yPositions = [];
      const xPositions = [];

      regionTokens.forEach((token) => {
        const [tx, ty, tw, th] = token.bbox;
        // Convert to percentage relative to region
        const relY = ((ty * 100 - region.y) / region.height) * 100;
        const relX = ((tx * 100 - region.x) / region.width) * 100;
        const relH = (th * 100 / region.height) * 100;
        const relW = (tw * 100 / region.width) * 100;

        yPositions.push(relY);
        yPositions.push(relY + relH);
        xPositions.push(relX);
        xPositions.push(relX + relW);
      });

      // Cluster positions to find gridlines
      const clusterPositions = (positions, threshold = 3) => {
        const sorted = [...new Set(positions)].sort((a, b) => a - b);
        const gaps = [];

        for (let i = 1; i < sorted.length; i++) {
          const gap = sorted[i] - sorted[i - 1];
          if (gap > threshold) {
            gaps.push((sorted[i - 1] + sorted[i]) / 2);
          }
        }

        // Filter to valid range (5-95)
        return gaps.filter((p) => p > 5 && p < 95);
      };

      const suggestedRows = clusterPositions(yPositions);
      const suggestedCols = clusterPositions(xPositions);

      if (suggestedRows.length > 0) {
        region.setRowLines(suggestedRows);
      }
      if (suggestedCols.length > 0) {
        region.setColLines(suggestedCols);
      }
    },

    /**
     * Extract cell text for all cells in a table region
     */
    extractCellText(region, tokens) {
      if (!region || !region.isTable || !tokens) return [];

      const cells = region.cells;
      const cellText = [];

      cells.forEach((cell) => {
        // Convert cell coordinates to absolute page coordinates
        const cellAbsX = region.x + (cell.x / 100) * region.width;
        const cellAbsY = region.y + (cell.y / 100) * region.height;
        const cellAbsW = (cell.width / 100) * region.width;
        const cellAbsH = (cell.height / 100) * region.height;

        // Find intersecting tokens
        const cellTokens = tokens.filter((token) => {
          const [tx, ty, tw, th] = token.bbox;
          const tokenX = tx * 100;
          const tokenY = ty * 100;
          const tokenW = tw * 100;
          const tokenH = th * 100;

          // Check if token center is within cell
          const tokenCenterX = tokenX + tokenW / 2;
          const tokenCenterY = tokenY + tokenH / 2;

          return (
            tokenCenterX >= cellAbsX &&
            tokenCenterX <= cellAbsX + cellAbsW &&
            tokenCenterY >= cellAbsY &&
            tokenCenterY <= cellAbsY + cellAbsH
          );
        });

        // Sort by reading order
        cellTokens.sort((a, b) => {
          const [ax, ay] = a.bbox;
          const [bx, by] = b.bbox;
          const yDiff = ay - by;
          if (Math.abs(yDiff) > 0.01) return yDiff;
          return ax - bx;
        });

        cellText.push({
          row: cell.row,
          col: cell.col,
          text: cellTokens.map((t) => t.text).join(' '),
        });
      });

      return cellText;
    },
  }));

const Composition = types.compose(
  ControlBase,
  LabelsModel,
  ModelAttrs,
  RectangleModel,
  Validation,
  LabelMixin,
  TableLabelsMixin,
  SelectedModelMixin.props({ _child: 'LabelModel' })
);

const TableLabelsModel = types.compose('TableLabelsModel', Composition);

/**
 * Table editing panel component
 */
const TableEditPanel = observer(({ item, region, tokens, onClose }) => {
  const handleRowLinesChange = useCallback(
    (lines) => {
      region?.setRowLines(lines);
    },
    [region]
  );

  const handleColLinesChange = useCallback(
    (lines) => {
      region?.setColLines(lines);
    },
    [region]
  );

  const handleAutoDetect = useCallback(() => {
    if (region && tokens) {
      item.autoDetectGridlines(region, tokens);
    }
  }, [item, region, tokens]);

  if (!region) return null;

  return (
    <div className={styles.editPanel}>
      <div className={styles.editPanelHeader}>
        <span>Edit Table Structure</span>
        <button className={styles.closeButton} onClick={onClose} title="Close">
          ×
        </button>
      </div>
      <div className={styles.editPanelBody}>
        <TableEditor
          region={region}
          tokens={tokens}
          onRowLinesChange={handleRowLinesChange}
          onColLinesChange={handleColLinesChange}
          visible={true}
        />
      </div>
      <div className={styles.editPanelFooter}>
        <button className={styles.actionButton} onClick={handleAutoDetect}>
          Auto-detect
        </button>
        <button
          className={styles.actionButton}
          onClick={() => region?.clearGridlines()}
        >
          Clear
        </button>
        <button className={`${styles.actionButton} ${styles.primary}`} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
});

/**
 * Main TableLabels component
 */
const HtxTableLabels = observer(({ item }) => {
  const [showEditPanel, setShowEditPanel] = useState(false);

  const editingTable = item.editingTable;
  const pdfOcr = item.pdfOcrObject;

  const handleCloseEdit = useCallback(() => {
    item.stopTableEdit();
    setShowEditPanel(false);
  }, [item]);

  // Get tokens for the current page (would need to be passed from PdfOcr)
  const tokens = []; // This would come from the PdfOcr component's state

  return (
    <div className={styles.container}>
      <HtxLabels item={item} />

      {/* Show edit button when a table region is selected */}
      {editingTable && (
        <div className={styles.tableActions}>
          <button
            className={styles.editTableButton}
            onClick={() => setShowEditPanel(true)}
            data-testid="edit-table-structure"
          >
            Edit Table Structure ({editingTable.numRows}×{editingTable.numCols})
          </button>
        </div>
      )}

      {/* Table editing panel */}
      {showEditPanel && editingTable && (
        <TableEditPanel
          item={item}
          region={editingTable}
          tokens={tokens}
          onClose={handleCloseEdit}
        />
      )}
    </div>
  );
});

Registry.addTag('tablelabels', TableLabelsModel, HtxTableLabels);

export { HtxTableLabels, TableLabelsModel };
