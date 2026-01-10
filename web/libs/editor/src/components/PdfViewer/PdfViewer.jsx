/**
 * PdfViewer Component - Core PDF rendering component using PDF.js
 *
 * Provides:
 * - PDF document loading and rendering
 * - Page caching for performance
 * - HiDPI canvas support
 * - Event callbacks for page loads
 */

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { observer } from 'mobx-react';
import { PdfDocument } from '../../utils/pdfLoader';

import styles from './PdfViewer.module.scss';

/**
 * Single page renderer component
 */
const PdfPage = memo(({ pdfDoc, pageNum, scale, rotation, onLoad, onError }) => {
  const canvasRef = useRef(null);
  const [isRendering, setIsRendering] = useState(false);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      // Cancel any pending render
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      setIsRendering(true);

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale, rotation });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const devicePixelRatio = window.devicePixelRatio || 1;

        // Set canvas dimensions for HiDPI
        canvas.width = Math.floor(viewport.width * devicePixelRatio);
        canvas.height = Math.floor(viewport.height * devicePixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        // Apply HiDPI transform
        const transform = devicePixelRatio !== 1
          ? [devicePixelRatio, 0, 0, devicePixelRatio, 0, 0]
          : null;

        const renderContext = {
          canvasContext: context,
          transform,
          viewport,
        };

        // Store render task for potential cancellation
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;

        // Notify parent of page dimensions
        onLoad?.({
          pageNum,
          width: viewport.width,
          height: viewport.height,
          originalWidth: page.getViewport({ scale: 1, rotation: 0 }).width,
          originalHeight: page.getViewport({ scale: 1, rotation: 0 }).height,
        });
      } catch (error) {
        if (error.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page:', error);
          onError?.(error);
        }
      } finally {
        setIsRendering(false);
        renderTaskRef.current = null;
      }
    };

    renderPage();

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, pageNum, scale, rotation, onLoad, onError]);

  return (
    <div className={styles.pageWrapper}>
      <canvas
        ref={canvasRef}
        className={styles.pageCanvas}
        data-testid={`pdf-page-${pageNum}`}
      />
      {isRendering && (
        <div className={styles.renderingIndicator}>
          <span className={styles.spinner} />
        </div>
      )}
    </div>
  );
});

PdfPage.displayName = 'PdfPage';

/**
 * Main PdfViewer component
 */
const PdfViewer = observer(({
  url,
  currentPage = 1,
  scale = 1.0,
  rotation = 0,
  onDocumentLoad,
  onPageLoad,
  onError,
  className,
  children,
}) => {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  // Load PDF document
  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    let document = null;
    let cancelled = false;

    const loadDocument = async () => {
      setLoading(true);
      setError(null);

      try {
        document = new PdfDocument(url);
        await document.load();

        if (!cancelled) {
          setPdfDoc(document);
          setLoading(false);

          // Notify parent of document info
          onDocumentLoad?.({
            numPages: document.numPages,
            url,
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading PDF:', err);
          setError(err.message || 'Failed to load PDF');
          setLoading(false);
          onError?.(err);
        }
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
      if (document) {
        document.destroy();
      }
    };
  }, [url, onDocumentLoad, onError]);

  // Handle page load callback
  const handlePageLoad = useCallback((pageInfo) => {
    onPageLoad?.(pageInfo);
  }, [onPageLoad]);

  // Handle page error
  const handlePageError = useCallback((err) => {
    setError(err.message || 'Error rendering page');
    onError?.(err);
  }, [onError]);

  // Loading state
  if (loading) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.loading}>
          <span className={styles.spinner} />
          <span>Loading PDF...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // No document
  if (!pdfDoc) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.empty}>No PDF loaded</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${className || ''}`}
      data-testid="pdf-viewer"
    >
      <div className={styles.viewport}>
        <div
          className={styles.pageContainer}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <PdfPage
            pdfDoc={pdfDoc}
            pageNum={currentPage}
            scale={1} // Base scale, parent handles zoom via CSS
            rotation={rotation}
            onLoad={handlePageLoad}
            onError={handlePageError}
          />
          {children}
        </div>
      </div>
    </div>
  );
});

PdfViewer.displayName = 'PdfViewer';

export { PdfViewer, PdfPage };
export default PdfViewer;
