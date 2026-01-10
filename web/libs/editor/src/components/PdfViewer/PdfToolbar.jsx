/**
 * PdfToolbar Component - Controls for PDF viewer
 *
 * Provides:
 * - Page navigation (prev/next, page input)
 * - Zoom controls (in/out, reset, fit)
 * - Rotation control
 */

import React, { useState, useCallback, memo } from 'react';

import styles from './PdfToolbar.module.scss';

/**
 * Page Navigation Controls
 */
const PageNavigation = memo(({
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  onGoToPage,
  visible = true,
}) => {
  const [inputValue, setInputValue] = useState(String(currentPage));

  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const handleInputBlur = useCallback(() => {
    const page = parseInt(inputValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onGoToPage?.(page);
    } else {
      setInputValue(String(currentPage));
    }
  }, [inputValue, currentPage, totalPages, onGoToPage]);

  const handleInputKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  }, [handleInputBlur]);

  // Sync input with current page
  React.useEffect(() => {
    setInputValue(String(currentPage));
  }, [currentPage]);

  if (!visible) return null;

  return (
    <div className={styles.controlGroup}>
      <button
        className={styles.toolButton}
        onClick={onPrevPage}
        disabled={currentPage <= 1}
        title="Previous page"
        data-testid="pdf-prev-page"
      >
        <span className={styles.icon}>◀</span>
      </button>
      <div className={styles.pageInfo} data-testid="pdf-page-indicator">
        <input
          type="text"
          className={styles.pageInput}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          aria-label="Current page"
        />
        <span className={styles.pageSeparator}>/</span>
        <span className={styles.totalPages}>{totalPages}</span>
      </div>
      <button
        className={styles.toolButton}
        onClick={onNextPage}
        disabled={currentPage >= totalPages}
        title="Next page"
        data-testid="pdf-next-page"
      >
        <span className={styles.icon}>▶</span>
      </button>
    </div>
  );
});

PageNavigation.displayName = 'PageNavigation';

/**
 * Zoom Controls
 */
const ZoomControls = memo(({
  scale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToWidth,
  visible = true,
}) => {
  const zoomPercent = Math.round(scale * 100);

  if (!visible) return null;

  return (
    <div className={styles.controlGroup}>
      <button
        className={styles.toolButton}
        onClick={onZoomOut}
        title="Zoom out"
        data-testid="pdf-zoom-out"
      >
        <span className={styles.icon}>−</span>
      </button>
      <span className={styles.zoomInfo} data-testid="pdf-zoom-level">
        {zoomPercent}%
      </span>
      <button
        className={styles.toolButton}
        onClick={onZoomIn}
        title="Zoom in"
        data-testid="pdf-zoom-in"
      >
        <span className={styles.icon}>+</span>
      </button>
      <button
        className={styles.toolButton}
        onClick={onResetZoom}
        title="Reset zoom"
        data-testid="pdf-zoom-reset"
      >
        <span className={styles.icon}>↺</span>
      </button>
      {onFitToWidth && (
        <button
          className={styles.toolButton}
          onClick={onFitToWidth}
          title="Fit to width"
          data-testid="pdf-fit-width"
        >
          <span className={styles.icon}>↔</span>
        </button>
      )}
    </div>
  );
});

ZoomControls.displayName = 'ZoomControls';

/**
 * Rotation Control
 */
const RotationControl = memo(({
  rotation,
  onRotate,
  visible = true,
}) => {
  if (!visible) return null;

  return (
    <div className={styles.controlGroup}>
      <button
        className={styles.toolButton}
        onClick={onRotate}
        title="Rotate 90°"
        data-testid="pdf-rotate"
      >
        <span className={styles.icon}>↻</span>
      </button>
      {rotation !== 0 && (
        <span className={styles.rotationInfo}>{rotation}°</span>
      )}
    </div>
  );
});

RotationControl.displayName = 'RotationControl';

/**
 * Main Toolbar Component
 */
const PdfToolbar = memo(({
  currentPage,
  totalPages,
  scale,
  rotation,
  showPageNavigation = true,
  showZoomControls = true,
  showRotationControl = true,
  onPrevPage,
  onNextPage,
  onGoToPage,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToWidth,
  onRotate,
  className,
}) => {
  return (
    <div className={`${styles.toolbar} ${className || ''}`} data-testid="pdf-toolbar">
      <PageNavigation
        currentPage={currentPage}
        totalPages={totalPages}
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
        onGoToPage={onGoToPage}
        visible={showPageNavigation}
      />

      <ZoomControls
        scale={scale}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetZoom={onResetZoom}
        onFitToWidth={onFitToWidth}
        visible={showZoomControls}
      />

      <RotationControl
        rotation={rotation}
        onRotate={onRotate}
        visible={showRotationControl}
      />
    </div>
  );
});

PdfToolbar.displayName = 'PdfToolbar';

export {
  PdfToolbar,
  PageNavigation,
  ZoomControls,
  RotationControl,
};
export default PdfToolbar;
