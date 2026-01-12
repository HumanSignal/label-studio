/**
 * PdfTextHighlight - Text selection highlight region for PDF documents.
 *
 * Represents a text highlight created by selecting OCR tokens in a PDF.
 * Unlike PdfRegion (box-based), this stores token indices for precise text selection.
 *
 * Features:
 * - Token-based text selection (tokenStart, tokenEnd)
 * - Automatic text extraction from selected tokens
 * - Position tracking (page, line)
 * - Computed bounding box from token positions
 */

import { getRoot, isAlive, types } from 'mobx-state-tree';
import { observer } from 'mobx-react';
import { useMemo, useCallback } from 'react';

import Constants from '../../core/Constants';
import { guidGenerator } from '../../core/Helpers';
import Registry from '../../core/Registry';
import { AreaMixin } from '../../mixins/AreaMixin';
import NormalizationMixin from '../../mixins/Normalization';
import RegionsMixin from '../../mixins/Regions';
import { EditableRegion } from '../EditableRegion';
import { PdfOcrModel } from '../../tags/object/PdfOcr';
import { calculateBoundingBox, extractTextFromTokens, getSelectedTokens } from '../../utils/pdf-selection';
import { getPositionReference } from '../../tags/object/PdfOcr/components/PositionTracker';

import styles from './PdfRegion.module.scss';

/**
 * PdfTextHighlight Model - MST model for PDF text highlight regions
 */
const Model = types
  .model('PdfTextHighlightModel', {
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: 'pdftexthighlight',

    // Reference to the parent PdfOcr object tag
    object: types.late(() => types.reference(PdfOcrModel)),

    // Text content (auto-populated from selected tokens)
    text: types.optional(types.string, ''),

    // PDF page number (1-based)
    page: types.optional(types.number, 1),

    // Token selection range (indices in the page's token array)
    tokenStart: types.number,
    tokenEnd: types.number,

    // Position reference (page, line, etc.)
    position: types.maybeNull(types.frozen()),
  })
  .volatile(() => ({
    // Visual properties
    opacity: 1,
    fillColor: '#ffeb3b', // Yellow highlight color
    fillOpacity: 0.4,
    strokeColor: '#ffc107',
    strokeWidth: 1,

    // Editing state
    _supportsTransform: false, // Highlights don't support free transform
    hideable: true,

    editableFields: [
      { property: 'page', label: 'Page' },
    ],
  }))
  .views((self) => ({
    get store() {
      return getRoot(self);
    },

    get parent() {
      return isAlive(self) ? self.object : null;
    },

    /**
     * Check if highlight is on the currently displayed page
     */
    get isOnCurrentPage() {
      if (!self.parent) return true;
      return self.page === self.parent._currentPage;
    },

    /**
     * Get the tokens for this highlight from the parent's OCR data
     */
    get highlightTokens() {
      if (!self.parent) return [];
      const pageTokens = self.parent.getPageTokens?.(self.page) || [];
      return getSelectedTokens(pageTokens, self.tokenStart, self.tokenEnd);
    },

    /**
     * Calculate bounding box from token positions
     * Returns coordinates in percentage (0-100) for rendering
     */
    get boundingBox() {
      const tokens = self.highlightTokens;
      if (!tokens || tokens.length === 0) {
        return null;
      }

      const bbox = calculateBoundingBox(tokens);
      if (!bbox) return null;

      // Convert from normalized (0-1) to percentage (0-100)
      return {
        x: bbox.x * 100,
        y: bbox.y * 100,
        width: bbox.width * 100,
        height: bbox.height * 100,
      };
    },

    /**
     * Get individual token bounding boxes for multi-line highlights
     * Returns array of boxes in percentage coordinates
     */
    get tokenBoundingBoxes() {
      const tokens = self.highlightTokens;
      if (!tokens || tokens.length === 0) {
        return [];
      }

      return tokens.map((token) => {
        const [x, y, width, height] = token.bbox;
        return {
          x: x * 100,
          y: y * 100,
          width: width * 100,
          height: height * 100,
          tokenId: token.id,
        };
      });
    },

    /**
     * Get coordinates for region compatibility (used by mixins)
     */
    get x() {
      return self.boundingBox?.x ?? 0;
    },

    get y() {
      return self.boundingBox?.y ?? 0;
    },

    get width() {
      return self.boundingBox?.width ?? 0;
    },

    get height() {
      return self.boundingBox?.height ?? 0;
    },

    /**
     * Get bounding box coords for area mixin compatibility
     */
    get bboxCoords() {
      const bbox = self.boundingBox;
      if (!bbox) {
        return { left: 0, top: 0, right: 0, bottom: 0 };
      }
      return {
        left: bbox.x,
        top: bbox.y,
        right: bbox.x + bbox.width,
        bottom: bbox.y + bbox.height,
      };
    },

    /**
     * Get formatted position string for display
     */
    get positionDisplay() {
      if (!self.position) {
        return `Page ${self.page}`;
      }

      const pos = self.position;
      const parts = [`Page ${pos.page}`];

      if (pos.line) {
        if (pos.lineEnd && pos.lineEnd !== pos.line) {
          parts.push(`Lines ${pos.line}-${pos.lineEnd}`);
        } else {
          parts.push(`Line ${pos.line}`);
        }
      } else if (pos.paragraph) {
        parts.push(`Paragraph ${pos.paragraph}`);
      }

      return parts.join(', ');
    },

    /**
     * Serialize highlight for annotation result
     */
    serialize() {
      const bbox = self.boundingBox || { x: 0, y: 0, width: 0, height: 0 };

      const result = {
        value: {
          text: self.text,
          page: self.page,
          tokenStart: self.tokenStart,
          tokenEnd: self.tokenEnd,
          // Include bounding box for rendering without OCR data
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height,
        },
      };

      // Include position reference
      if (self.position) {
        result.value.position = { ...self.position };
      }

      return result;
    },
  }))
  .actions((self) => ({
    /**
     * After create hook - calculate text and position from tokens
     */
    afterCreate() {
      // Text and position should be set during creation
      // This hook ensures they're populated if not provided
      if (!self.text && self.parent) {
        self.updateTextFromTokens();
      }
    },

    /**
     * Restore highlight from saved annotation value
     */
    fromJSON(value) {
      if (value.text !== undefined) self.text = value.text;
      if (value.page !== undefined) self.page = value.page;
      if (value.tokenStart !== undefined) self.tokenStart = value.tokenStart;
      if (value.tokenEnd !== undefined) self.tokenEnd = value.tokenEnd;
      if (value.position) self.position = value.position;
    },

    /**
     * Update text content from selected tokens
     */
    updateTextFromTokens() {
      const tokens = self.highlightTokens;
      if (tokens && tokens.length > 0) {
        self.text = extractTextFromTokens(tokens);
      }
    },

    /**
     * Update token selection range
     * @param {number} tokenStart - New start token index
     * @param {number} tokenEnd - New end token index
     */
    setTokenRange(tokenStart, tokenEnd) {
      self.tokenStart = Math.min(tokenStart, tokenEnd);
      self.tokenEnd = Math.max(tokenStart, tokenEnd);

      // Update text and position
      self.updateTextFromTokens();
      self.updatePosition();
    },

    /**
     * Update position reference based on current tokens
     */
    updatePosition() {
      if (!self.parent) return;

      const pageTokens = self.parent.getPageTokens?.(self.page) || [];
      if (pageTokens.length === 0) {
        self.position = { page: self.page };
        return;
      }

      const positionRef = getPositionReference({
        tokens: pageTokens,
        tokenStart: self.tokenStart,
        tokenEnd: self.tokenEnd,
        page: self.page,
      });

      self.position = positionRef;
    },

    /**
     * Set position reference directly
     */
    setPosition(position) {
      self.position = position;
    },

    /**
     * Set page number
     */
    setPage(page) {
      self.page = page;
    },

    /**
     * Set text content (for manual override)
     */
    setText(text) {
      const maxLength = 1000;
      if (text && text.length > maxLength) {
        self.text = text.substring(0, maxLength);
      } else {
        self.text = text || '';
      }
    },

    /**
     * Expand selection to include adjacent token
     * @param {'start' | 'end'} direction - Which end to expand
     */
    expandSelection(direction) {
      if (!self.parent) return;

      const pageTokens = self.parent.getPageTokens?.(self.page) || [];
      const maxIndex = pageTokens.length - 1;

      if (direction === 'start' && self.tokenStart > 0) {
        self.tokenStart -= 1;
      } else if (direction === 'end' && self.tokenEnd < maxIndex) {
        self.tokenEnd += 1;
      }

      self.updateTextFromTokens();
      self.updatePosition();
    },

    /**
     * Contract selection to remove token from end
     * @param {'start' | 'end'} direction - Which end to contract
     */
    contractSelection(direction) {
      // Ensure we don't contract to empty selection
      if (self.tokenStart >= self.tokenEnd) return;

      if (direction === 'start') {
        self.tokenStart += 1;
      } else if (direction === 'end') {
        self.tokenEnd -= 1;
      }

      self.updateTextFromTokens();
      self.updatePosition();
    },
  }));

/**
 * Compose highlight model with mixins
 */
const PdfTextHighlightModel = types.compose(
  'PdfTextHighlightModel',
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  EditableRegion,
  Model
);

/**
 * PdfTextHighlight React Component - Visual representation of text highlight
 */
const HtxPdfTextHighlight = observer(({ item }) => {
  const isSelected = item.selected;
  const isOnCurrentPage = item.isOnCurrentPage;

  // Don't render if not on current page
  if (!isOnCurrentPage) {
    return null;
  }

  const tokenBoxes = item.tokenBoundingBoxes;

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

  // If no token boxes, render a single bounding box
  if (!tokenBoxes || tokenBoxes.length === 0) {
    const bbox = item.boundingBox;
    if (!bbox) return null;

    return (
      <div
        className={`${styles.highlight} lsf-region ${isSelected ? `${styles.selected} lsf-region_selected` : ''}`}
        style={{
          left: `${bbox.x}%`,
          top: `${bbox.y}%`,
          width: `${bbox.width}%`,
          height: `${bbox.height}%`,
          backgroundColor: `${item.getOneColor?.() || item.fillColor}${Math.round(item.fillOpacity * 255).toString(16).padStart(2, '0')}`,
          opacity: item.hidden ? 0 : item.opacity,
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-region-id={item.id}
        data-page={item.page}
      />
    );
  }

  // Render individual token highlights for precise multi-line selection
  return (
    <div
      className={`${styles.highlightGroup} lsf-region ${isSelected ? 'lsf-region_selected' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-region-id={item.id}
      data-page={item.page}
    >
      {tokenBoxes.map((box, index) => (
        <div
          key={box.tokenId || index}
          className={`${styles.highlightToken} ${isSelected ? styles.selected : ''}`}
          style={{
            left: `${box.x}%`,
            top: `${box.y}%`,
            width: `${box.width}%`,
            height: `${box.height}%`,
            backgroundColor: `${item.getOneColor?.() || item.fillColor}${Math.round(item.fillOpacity * 255).toString(16).padStart(2, '0')}`,
            opacity: item.hidden ? 0 : item.opacity,
          }}
        />
      ))}

      {/* Label display */}
      {item.showLabel && tokenBoxes.length > 0 && (
        <div
          className={styles.highlightLabel}
          style={{
            left: `${tokenBoxes[0].x}%`,
            top: `${tokenBoxes[0].y}%`,
            transform: 'translateY(-100%)',
          }}
        >
          {item.labeling?.selectedLabels?.map((l) => l.value).join(', ')}
        </div>
      )}
    </div>
  );
});

// Detector function helps MST union determine when to use PdfTextHighlightModel
const detectPdfTextHighlight = (value) => {
  // Text highlights have tokenStart and tokenEnd
  return value && (
    value.tokenStart !== undefined &&
    value.tokenEnd !== undefined
  );
};

// Register the region
Registry.addTag('pdftexthighlight', PdfTextHighlightModel, HtxPdfTextHighlight);
Registry.addRegionType(PdfTextHighlightModel, 'pdfocr', detectPdfTextHighlight);

export { PdfTextHighlightModel, HtxPdfTextHighlight };
export default PdfTextHighlightModel;
