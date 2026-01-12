/**
 * PdfOcr React Component - PDF viewer with OCR token overlay support.
 *
 * Provides:
 * - PDF rendering using PDF.js
 * - OCR token visualization
 * - Zoom, rotation, and page navigation controls
 * - Region annotation support
 */

import { inject, observer } from 'mobx-react';
import { useEffect, useRef, useCallback, useState } from 'react';

import Registry from '../../../core/Registry';
import { PdfOcrModel } from './PdfOcrModel';
import { PdfDocument } from '../../../utils/pdfLoader';
import { getPositionReference } from './components/PositionTracker';
import {
  getTokenIndicesInRect,
  extractTextFromTokens,
  calculateBoundingBox,
  getSelectedTokens,
  findClosestToken,
} from '../../../utils/pdf-selection';

import styles from './PdfOcr.module.scss';

/**
 * Toolbar component for PDF controls
 */
const PdfToolbar = observer(({ item }) => {
  const handleZoomIn = useCallback(() => item.zoomIn(), [item]);
  const handleZoomOut = useCallback(() => item.zoomOut(), [item]);
  const handleResetZoom = useCallback(() => item.resetZoom(), [item]);
  const handleRotate = useCallback(() => item.rotate(), [item]);
  const handlePrevPage = useCallback(() => item.prevPage(), [item]);
  const handleNextPage = useCallback(() => item.nextPage(), [item]);

  return (
    <div className={styles.toolbar}>
      {item.pagenavigation && (
        <div className={styles.toolbarGroup}>
          <button
            className={styles.toolbarButton}
            onClick={handlePrevPage}
            disabled={!item.canGoPrev}
            title="Previous page"
          >
            ◀
          </button>
          <span className={styles.pageInfo}>
            {item._currentPage} / {item._totalPages}
          </span>
          <button
            className={styles.toolbarButton}
            onClick={handleNextPage}
            disabled={!item.canGoNext}
            title="Next page"
          >
            ▶
          </button>
        </div>
      )}

      {item.zoomcontrol && (
        <div className={styles.toolbarGroup}>
          <button
            className={styles.toolbarButton}
            onClick={handleZoomOut}
            title="Zoom out"
          >
            −
          </button>
          <span className={styles.zoomInfo}>
            {Math.round(item._scale * 100)}%
          </span>
          <button
            className={styles.toolbarButton}
            onClick={handleZoomIn}
            title="Zoom in"
          >
            +
          </button>
          <button
            className={styles.toolbarButton}
            onClick={handleResetZoom}
            title="Reset zoom"
          >
            ⟲
          </button>
        </div>
      )}

      {item.rotatecontrol && (
        <div className={styles.toolbarGroup}>
          <button
            className={styles.toolbarButton}
            onClick={handleRotate}
            title="Rotate 90°"
          >
            ↻
          </button>
        </div>
      )}
    </div>
  );
});

/**
 * PDF page canvas renderer
 */
const PdfCanvas = observer(({ pdfDoc, pageNum, scale, rotation, onPageLoad }) => {
  const canvasRef = useRef(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      setRendering(true);
      try {
        await pdfDoc.renderPage(pageNum, canvasRef.current, {
          scale,
          rotation,
        });

        // Get page for dimensions
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1, rotation: 0 });
        onPageLoad?.(viewport.width, viewport.height);
      } catch (error) {
        console.error('Error rendering PDF page:', error);
      } finally {
        setRendering(false);
      }
    };

    renderPage();
  }, [pdfDoc, pageNum, scale, rotation, onPageLoad]);

  return (
    <div className={styles.canvasWrapper}>
      <canvas ref={canvasRef} className={styles.pdfCanvas} />
      {rendering && <div className={styles.renderingOverlay}>Rendering...</div>}
    </div>
  );
});

/**
 * OCR token overlay component
 */
const OcrTokenOverlay = observer(({ tokens, scale, pageWidth, pageHeight, visible }) => {
  if (!visible || !tokens || tokens.length === 0) {
    return null;
  }

  return (
    <div className={styles.tokenOverlay}>
      {tokens.map((token) => {
        const [x, y, width, height] = token.bbox;
        const style = {
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          width: `${width * 100}%`,
          height: `${height * 100}%`,
        };

        return (
          <div
            key={token.id}
            className={styles.token}
            style={style}
            title={token.text}
            data-token-id={token.id}
          >
            <span className={styles.tokenText}>{token.text}</span>
          </div>
        );
      })}
    </div>
  );
});

/**
 * Text selection preview component - shows selected tokens before label is applied
 */
const TextSelectionPreview = observer(({ tokens, startIndex, endIndex, visible }) => {
  if (!visible || startIndex === null || endIndex === null || !tokens || tokens.length === 0) {
    return null;
  }

  const selectedTokens = getSelectedTokens(tokens, startIndex, endIndex);
  if (selectedTokens.length === 0) return null;

  return (
    <div className={styles.selectionPreviewContainer}>
      {selectedTokens.map((token, index) => {
        const [x, y, width, height] = token.bbox;
        return (
          <div
            key={token.id || index}
            className={styles.selectionPreviewToken}
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${width * 100}%`,
              height: `${height * 100}%`,
            }}
          />
        );
      })}
    </div>
  );
});

/**
 * Interactive OCR token layer for text selection
 */
const InteractiveTokenLayer = observer(({
  tokens,
  visible,
  onTokenMouseDown,
  onTokenMouseEnter,
  selectionStart,
  selectionEnd,
}) => {
  if (!visible || !tokens || tokens.length === 0) {
    return null;
  }

  return (
    <div className={styles.interactiveTokenLayer}>
      {tokens.map((token, index) => {
        const [x, y, width, height] = token.bbox;
        const isSelected =
          selectionStart !== null &&
          selectionEnd !== null &&
          index >= Math.min(selectionStart, selectionEnd) &&
          index <= Math.max(selectionStart, selectionEnd);

        return (
          <div
            key={token.id || index}
            className={`${styles.interactiveToken} ${isSelected ? styles.tokenSelected : ''}`}
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${width * 100}%`,
              height: `${height * 100}%`,
            }}
            onMouseDown={(e) => onTokenMouseDown(e, index)}
            onMouseEnter={(e) => onTokenMouseEnter(e, index)}
            data-token-index={index}
            data-token-id={token.id}
            title={token.text}
          />
        );
      })}
    </div>
  );
});

/**
 * Table gridlines component - renders gridlines for table regions
 */
const TableGridlinesOverlay = observer(({ region }) => {
  if (!region.isTable) return null;

  const rowLines = region.row_lines || [];
  const colLines = region.col_lines || [];

  return (
    <div className={styles.tableGridlines}>
      {/* Horizontal gridlines (row separators) */}
      {rowLines.map((pos, index) => (
        <div
          key={`row-${index}`}
          className={`${styles.tableGridline} ${styles.tableGridlineHorizontal}`}
          style={{ top: `${pos}%` }}
          data-line-type="row"
          data-line-index={index}
        />
      ))}

      {/* Vertical gridlines (column separators) */}
      {colLines.map((pos, index) => (
        <div
          key={`col-${index}`}
          className={`${styles.tableGridline} ${styles.tableGridlineVertical}`}
          style={{ left: `${pos}%` }}
          data-line-type="col"
          data-line-index={index}
        />
      ))}
    </div>
  );
});

/**
 * Text highlight region component - displays text highlight regions
 */
const TextHighlightRegion = observer(({ region }) => {
  const isSelected = region.selected;
  const color = region.getOneColor?.() || '#ffeb3b';
  const tokenBoxes = region.tokenBoundingBoxes || [];

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    region.onClickRegion?.(e);
  }, [region]);

  const handleMouseEnter = useCallback(() => {
    region.setHighlight?.(true);
  }, [region]);

  const handleMouseLeave = useCallback(() => {
    region.setHighlight?.(false);
  }, [region]);

  // Render individual token highlights for precise multi-line selection
  if (tokenBoxes.length > 0) {
    return (
      <div
        className={`${styles.highlightGroup} lsf-region ${isSelected ? 'lsf-region_selected' : ''}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-region-id={region.id}
        data-page={region.page}
      >
        {tokenBoxes.map((box, index) => (
          <div
            key={box.tokenId || index}
            className={`${styles.highlightToken} ${isSelected ? styles.highlightSelected : ''}`}
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
              backgroundColor: `${color}66`,
              opacity: region.hidden ? 0 : 1,
            }}
          />
        ))}

        {/* Label display */}
        {region.labeling?.selectedLabels?.length > 0 && tokenBoxes.length > 0 && (
          <div
            className={styles.highlightLabel}
            style={{
              left: `${tokenBoxes[0].x}%`,
              top: `${tokenBoxes[0].y}%`,
              transform: 'translateY(-100%)',
            }}
          >
            {region.labeling.selectedLabels.map((l) => l.value).join(', ')}
          </div>
        )}
      </div>
    );
  }

  // Fallback: render single bounding box
  const bbox = region.boundingBox;
  if (!bbox) return null;

  return (
    <div
      className={`${styles.highlight} lsf-region ${isSelected ? `${styles.highlightSelected} lsf-region_selected` : ''}`}
      style={{
        left: `${bbox.x}%`,
        top: `${bbox.y}%`,
        width: `${bbox.width}%`,
        height: `${bbox.height}%`,
        backgroundColor: `${color}66`,
        opacity: region.hidden ? 0 : 1,
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-region-id={region.id}
      data-page={region.page}
    />
  );
});

/**
 * Region overlay component - displays existing regions
 */
const RegionOverlay = observer(({ item, regions, currentPage }) => {
  // Filter regions for current page
  const pageRegions = regions.filter((r) => r.page === currentPage);

  if (pageRegions.length === 0) {
    return null;
  }

  return (
    <div className={styles.regionOverlay}>
      {pageRegions.map((region) => {
        // Check if this is a text highlight region
        if (region.type === 'pdftexthighlight') {
          return <TextHighlightRegion key={region.id} region={region} />;
        }

        // Box region rendering
        const isSelected = region.selected;
        const color = region.getOneColor?.() || '#ff8800';
        const isTable = region.isTable;

        return (
          <div
            key={region.id}
            className={`${styles.region} lsf-region ${isSelected ? styles.regionSelected + ' lsf-region_selected' : ''} ${isTable ? styles.tableRegion : ''}`}
            style={{
              left: `${region.x}%`,
              top: `${region.y}%`,
              width: `${region.width}%`,
              height: `${region.height}%`,
              backgroundColor: `${color}33`,
              borderColor: color,
            }}
            onClick={(e) => {
              e.stopPropagation();
              region.onClickRegion?.(e);
            }}
            data-region-id={region.id}
            data-is-table={isTable}
          >
            {region.labeling?.selectedLabels?.length > 0 && (
              <div className={styles.regionLabel}>
                {region.labeling.selectedLabels.map((l) => l.value).join(', ')}
                {isTable && ` (${region.numRows}×${region.numCols})`}
              </div>
            )}

            {/* Render table gridlines if this is a table region */}
            {isTable && <TableGridlinesOverlay region={region} />}
          </div>
        );
      })}
    </div>
  );
});

/**
 * No text layer message - shown when text selection is enabled but no OCR tokens available
 */
const NoTextLayerMessage = observer(({ visible }) => {
  if (!visible) return null;

  return (
    <div className={styles.noTextLayerMessage}>
      <span className={styles.noTextLayerIcon}>📄</span>
      <span>No text layer available</span>
      <span className={styles.noTextLayerHint}>
        This PDF does not contain selectable text. Draw bounding boxes to annotate regions.
      </span>
    </div>
  );
});

/**
 * Drawing overlay component - shows region being drawn
 */
const DrawingOverlay = observer(({ isDrawing, startPoint, currentPoint }) => {
  if (!isDrawing || !startPoint || !currentPoint) {
    return null;
  }

  const x = Math.min(startPoint.x, currentPoint.x);
  const y = Math.min(startPoint.y, currentPoint.y);
  const width = Math.abs(currentPoint.x - startPoint.x);
  const height = Math.abs(currentPoint.y - startPoint.y);

  return (
    <div
      className={styles.drawingRect}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
    />
  );
});

/**
 * Main PdfOcr component
 */
const HtxPdfOcr = inject('store')(
  observer(({ item, store }) => {
    const containerRef = useRef(null);
    const pageContainerRef = useRef(null);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [tokens, setTokens] = useState([]);

    // Drawing state (for box regions)
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState(null);
    const [currentPoint, setCurrentPoint] = useState(null);

    // Text selection state (for highlight regions)
    const [isSelectingText, setIsSelectingText] = useState(false);
    const [selectionStart, setSelectionStart] = useState(null);
    const [selectionEnd, setSelectionEnd] = useState(null);

    // Get mouse position as percentage of page container
    const getMousePosition = useCallback((e) => {
      if (!pageContainerRef.current) return null;

      const rect = pageContainerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      return {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      };
    }, []);

    // Handle mouse down - start drawing
    const handleMouseDown = useCallback((e) => {
      // Only draw with left mouse button
      if (e.button !== 0) return;

      // Check if a label is selected
      const control = item.annotation?.names?.get(item.controlTagName);
      if (!control?.selectedLabels?.length) return;

      const pos = getMousePosition(e);
      if (!pos) return;

      setIsDrawing(true);
      setStartPoint(pos);
      setCurrentPoint(pos);
    }, [item, getMousePosition]);

    // Handle mouse move - update drawing
    const handleMouseMove = useCallback((e) => {
      if (!isDrawing) return;

      const pos = getMousePosition(e);
      if (pos) {
        setCurrentPoint(pos);
      }
    }, [isDrawing, getMousePosition]);

    // Handle mouse up - complete drawing
    const handleMouseUp = useCallback((e) => {
      if (!isDrawing || !startPoint || !currentPoint) {
        setIsDrawing(false);
        return;
      }

      // Calculate region bounds
      const x = Math.min(startPoint.x, currentPoint.x);
      const y = Math.min(startPoint.y, currentPoint.y);
      const width = Math.abs(currentPoint.x - startPoint.x);
      const height = Math.abs(currentPoint.y - startPoint.y);

      // Minimum size check
      if (width < 1 || height < 1) {
        setIsDrawing(false);
        setStartPoint(null);
        setCurrentPoint(null);
        return;
      }

      // Create region
      const control = item.annotation?.names?.get(item.controlTagName);
      if (control?.selectedLabels?.length > 0) {
        const region = item.annotation.createResult(
          {
            x,
            y,
            width,
            height,
            rotation: 0,
            page: item._currentPage,
          },
          control.getResultValue(),
          control,
          item
        );

        // Extract OCR text from region and calculate position
        if (region && tokens.length > 0) {
          const extractedText = extractTextFromRegion(tokens, { x, y, width, height });
          if (extractedText) {
            region.setExtractedText?.(extractedText);
          }

          // Calculate position reference with line numbers
          // Convert region coords from 0-100 to 0-1 for token matching
          const normalizedRect = {
            x: x / 100,
            y: y / 100,
            width: width / 100,
            height: height / 100,
          };

          const tokenIndices = getTokenIndicesInRect(tokens, normalizedRect, { normalized: true });
          if (tokenIndices) {
            const positionRef = getPositionReference({
              tokens,
              tokenStart: tokenIndices.startIndex,
              tokenEnd: tokenIndices.endIndex,
              page: item._currentPage,
            });
            region.setPosition?.(positionRef);
          } else {
            // Fallback: set position with just page number
            region.setPosition?.({ page: item._currentPage });
          }
        } else if (region) {
          // No tokens, just set page
          region.setPosition?.({ page: item._currentPage });
        }
      }

      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPoint(null);
    }, [isDrawing, startPoint, currentPoint, item, tokens]);

    // Extract text from tokens within a region
    const extractTextFromRegion = useCallback((tokens, region) => {
      const intersectingTokens = tokens.filter((token) => {
        const [tx, ty, tw, th] = token.bbox;
        // Convert normalized (0-1) to percentage (0-100)
        const tokenX = tx * 100;
        const tokenY = ty * 100;
        const tokenW = tw * 100;
        const tokenH = th * 100;

        // Check intersection
        return (
          tokenX < region.x + region.width &&
          tokenX + tokenW > region.x &&
          tokenY < region.y + region.height &&
          tokenY + tokenH > region.y
        );
      });

      // Sort by reading order and join
      intersectingTokens.sort((a, b) => {
        const [ax, ay] = a.bbox;
        const [bx, by] = b.bbox;
        const yDiff = ay - by;
        if (Math.abs(yDiff) > 0.01) return yDiff;
        return ax - bx;
      });

      return intersectingTokens.map((t) => t.text).join(' ');
    }, []);

    // Text selection handlers
    const handleTokenMouseDown = useCallback((e, tokenIndex) => {
      e.stopPropagation();
      e.preventDefault();

      // Start text selection
      setIsSelectingText(true);
      setSelectionStart(tokenIndex);
      setSelectionEnd(tokenIndex);
    }, []);

    const handleTokenMouseEnter = useCallback((e, tokenIndex) => {
      if (!isSelectingText) return;

      // Extend selection
      setSelectionEnd(tokenIndex);
    }, [isSelectingText]);

    const handleTextSelectionEnd = useCallback((e) => {
      if (!isSelectingText) return;

      setIsSelectingText(false);

      // If we have a valid selection, keep it visible until label is applied
      // The selection will be cleared when a highlight is created or user clicks elsewhere
    }, [isSelectingText]);

    // Create text highlight from current selection
    const createTextHighlight = useCallback(() => {
      if (selectionStart === null || selectionEnd === null) return null;
      if (!tokens || tokens.length === 0) return null;

      const control = item.annotation?.names?.get(item.controlTagName);
      if (!control?.selectedLabels?.length) return null;

      const startIdx = Math.min(selectionStart, selectionEnd);
      const endIdx = Math.max(selectionStart, selectionEnd);
      const selectedTokens = getSelectedTokens(tokens, startIdx, endIdx);

      if (selectedTokens.length === 0) return null;

      // Extract text from selected tokens
      const text = extractTextFromTokens(selectedTokens);

      // Calculate bounding box
      const bbox = calculateBoundingBox(selectedTokens);

      // Calculate position reference
      const positionRef = getPositionReference({
        tokens,
        tokenStart: startIdx,
        tokenEnd: endIdx,
        page: item._currentPage,
      });

      // Create the highlight region
      const region = item.annotation.createResult(
        {
          text,
          page: item._currentPage,
          tokenStart: startIdx,
          tokenEnd: endIdx,
          // Include bbox for rendering
          x: bbox ? bbox.x * 100 : 0,
          y: bbox ? bbox.y * 100 : 0,
          width: bbox ? bbox.width * 100 : 0,
          height: bbox ? bbox.height * 100 : 0,
          position: positionRef,
        },
        control.getResultValue(),
        control,
        item
      );

      // Clear selection after creating highlight
      setSelectionStart(null);
      setSelectionEnd(null);

      return region;
    }, [selectionStart, selectionEnd, tokens, item]);

    // Clear text selection when clicking outside tokens
    const handleContainerClick = useCallback((e) => {
      // Don't clear if we're clicking on a token or region
      if (e.target.closest('[data-token-index]') || e.target.closest('[data-region-id]')) {
        return;
      }

      // Clear selection if clicking on empty area
      if (selectionStart !== null || selectionEnd !== null) {
        setSelectionStart(null);
        setSelectionEnd(null);
      }
    }, [selectionStart, selectionEnd]);

    // Watch for label selection to create highlight from current text selection
    useEffect(() => {
      if (selectionStart === null || selectionEnd === null) return;

      const control = item.annotation?.names?.get(item.controlTagName);
      if (control?.selectedLabels?.length > 0 && !isSelectingText) {
        // Label was selected while we have a text selection - create highlight
        createTextHighlight();
      }
    }, [item.annotation?.names?.get(item.controlTagName)?.selectedLabels?.length, selectionStart, selectionEnd, isSelectingText, createTextHighlight, item.controlTagName]);

    // Check if text selection mode is active
    const hasTextSelection = selectionStart !== null && selectionEnd !== null;

    // Keyboard shortcuts handler
    const handleKeyDown = useCallback((e) => {
      // Only handle when container is focused
      if (!containerRef.current?.contains(document.activeElement)) return;

      // Zoom shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '+':
          case '=':
            e.preventDefault();
            item.zoomIn();
            break;
          case '-':
            e.preventDefault();
            item.zoomOut();
            break;
          case '0':
            e.preventDefault();
            item.resetZoom();
            break;
        }
      }

      // Page navigation shortcuts
      switch (e.key) {
        case 'PageDown':
          e.preventDefault();
          item.nextPage();
          break;
        case 'PageUp':
          e.preventDefault();
          item.prevPage();
          break;
        case 'Home':
          if (e.ctrlKey) {
            e.preventDefault();
            item.goToPage(1);
          }
          break;
        case 'End':
          if (e.ctrlKey) {
            e.preventDefault();
            item.goToPage(item._totalPages);
          }
          break;
      }
    }, [item]);

    // Register keyboard listener
    useEffect(() => {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Load PDF document
    useEffect(() => {
      if (!item._pdfUrl) return;

      const loadDocument = async () => {
        item.setLoading(true);
        try {
          const doc = new PdfDocument(item._pdfUrl);
          await doc.load();

          item.setPdfInfo(doc.numPages, 612, 792); // Default page size
          item.setPdfDocument(doc);
          setPdfDoc(doc);
        } catch (error) {
          console.error('Error loading PDF:', error);
          item.setError(`Failed to load PDF: ${error.message}`);
        }
      };

      loadDocument();

      return () => {
        if (pdfDoc) {
          pdfDoc.destroy();
        }
      };
    }, [item._pdfUrl]);

    // Load OCR tokens for current page
    useEffect(() => {
      if (!pdfDoc || !item.tokenoverlay) return;

      const loadTokens = async () => {
        try {
          // Check if tokens are already cached in the model
          const cachedTokens = item.getPageTokens(item._currentPage);
          if (cachedTokens && cachedTokens.length > 0) {
            setTokens(cachedTokens);
            item.setOcrAvailable(true);
            return;
          }

          // Try to get tokens from embedded text layer first
          const pageTokens = await pdfDoc.getTokens(item._currentPage);
          setTokens(pageTokens);
          item.setOcrAvailable(pageTokens.length > 0);

          // Store tokens in model for region access
          if (pageTokens && pageTokens.length > 0) {
            item.setPageTokens(item._currentPage, pageTokens);
          }
        } catch (error) {
          console.error('Error loading tokens:', error);
          setTokens([]);
        }
      };

      loadTokens();
    }, [pdfDoc, item._currentPage, item.tokenoverlay]);

    // Handle page dimension updates
    const handlePageLoad = useCallback(
      (width, height) => {
        item.setPageDimensions(width, height);
      },
      [item]
    );

    // Handle container resize for fit-to-width
    useEffect(() => {
      if (!containerRef.current) return;

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width } = entry.contentRect;
          // Optionally auto-fit to width on resize
          // item.fitToWidth(width);
        }
      });

      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }, [item]);

    // Error state
    if (item.hasError) {
      return (
        <div className={styles.container}>
          <div className={styles.error}>
            <span className={styles.errorIcon}>⚠</span>
            <span>{item._error}</span>
          </div>
        </div>
      );
    }

    // Loading state
    if (item._loading || !pdfDoc) {
      return (
        <div className={styles.container}>
          <div className={styles.loading}>
            <span className={styles.spinner} />
            <span>Loading PDF...</span>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={`${styles.container} lsf-pdfocr__container`}
        style={{
          maxWidth: item.maxwidth,
          maxHeight: item.maxheight,
        }}
        tabIndex={0}
        data-testid="pdfocr-container"
      >
        <PdfToolbar item={item} />

        <div className={styles.viewerWrapper}>
          <div
            ref={pageContainerRef}
            className={styles.pageContainer}
            style={{
              transform: `scale(${item._scale})`,
              transformOrigin: 'top left',
              cursor: item.annotation?.names?.get(item.controlTagName)?.selectedLabels?.length
                ? 'crosshair'
                : 'default',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={(e) => {
              handleMouseUp(e);
              handleTextSelectionEnd(e);
            }}
            onMouseLeave={(e) => {
              handleMouseUp(e);
              handleTextSelectionEnd(e);
            }}
            onClick={handleContainerClick}
          >
            <PdfCanvas
              pdfDoc={pdfDoc}
              pageNum={item._currentPage}
              scale={1} // Base scale, CSS transform handles zoom
              rotation={item._rotation}
              onPageLoad={handlePageLoad}
            />

            <OcrTokenOverlay
              tokens={tokens}
              scale={item._scale}
              pageWidth={item._pageWidth}
              pageHeight={item._pageHeight}
              visible={item.tokenoverlay && !item.textselection}
            />

            {/* Interactive token layer for text selection */}
            <InteractiveTokenLayer
              tokens={tokens}
              visible={item.tokenoverlay && item.textselection}
              onTokenMouseDown={handleTokenMouseDown}
              onTokenMouseEnter={handleTokenMouseEnter}
              selectionStart={selectionStart}
              selectionEnd={selectionEnd}
            />

            {/* Text selection preview */}
            <TextSelectionPreview
              tokens={tokens}
              startIndex={selectionStart}
              endIndex={selectionEnd}
              visible={hasTextSelection && !isSelectingText}
            />

            {/* Existing regions */}
            <RegionOverlay
              item={item}
              regions={item.regs || []}
              currentPage={item._currentPage}
            />

            {/* Region being drawn */}
            <DrawingOverlay
              isDrawing={isDrawing}
              startPoint={startPoint}
              currentPoint={currentPoint}
            />

            {/* No text layer message */}
            <NoTextLayerMessage
              visible={item.textselection && tokens.length === 0 && !item._loading}
            />
          </div>
        </div>
      </div>
    );
  })
);

// Register tag with Registry (unconditional like Image tag)
Registry.addTag('pdfocr', PdfOcrModel, HtxPdfOcr);
Registry.addObjectType(PdfOcrModel);

export { HtxPdfOcr, PdfOcrModel };
export default PdfOcrModel;
