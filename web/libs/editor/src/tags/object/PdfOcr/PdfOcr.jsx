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

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState(null);
    const [currentPoint, setCurrentPoint] = useState(null);

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

        // Extract OCR text from region
        if (region && tokens.length > 0) {
          const extractedText = extractTextFromRegion(tokens, { x, y, width, height });
          if (extractedText) {
            region.setExtractedText?.(extractedText);
          }
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
          // Try to get tokens from embedded text layer first
          const pageTokens = await pdfDoc.getTokens(item._currentPage);
          setTokens(pageTokens);
          item.setOcrAvailable(pageTokens.length > 0);
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
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
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
              visible={item.tokenoverlay}
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
