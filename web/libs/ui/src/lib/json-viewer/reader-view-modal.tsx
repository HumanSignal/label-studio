import { type FC, useState, useMemo } from "react";
import sanitizeHtml from "sanitize-html";
import { Markdown } from "../../../../editor/src/components/Markdown/Markdown";
import { Modal } from "../modal";
import { SegmentedControl } from "../segmented-control/segmented-control";
import styles from "./reader-view-modal.module.css";

type ContentFormat = "plain" | "markdown" | "html";

export interface ReaderViewModalProps {
  content: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ReaderViewModal - Full-screen modal for viewing long strings
 *
 * Provides three viewing modes:
 * - Plain Text: Raw text with preserved whitespace
 * - Markdown: Rendered markdown content
 * - HTML: Sanitized HTML content
 */
export const ReaderViewModal: FC<ReaderViewModalProps> = ({ content, isOpen, onClose }) => {
  const [format, setFormat] = useState<ContentFormat>("plain");

  // Sanitize HTML content
  const sanitizedHtml = useMemo(() => {
    if (format !== "html") return "";

    return sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        "*": ["class", "style"],
      },
    });
  }, [content, format]);

  const renderContent = () => {
    switch (format) {
      case "plain":
        return (
          <pre className={styles.plainText} aria-label="Plain text content">
            {content}
          </pre>
        );
      case "markdown":
        return (
          <div className={styles.markdownContent} aria-label="Markdown content">
            <Markdown text={content} allowHtml={true} />
          </div>
        );
      case "html":
        return (
          <div
            className={styles.htmlContent}
            aria-label="HTML content"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        );
      default:
        return null;
    }
  };

  const headerContent = (
    <SegmentedControl
      aria-label="Format"
      selectedOption={format}
      onChange={(v) => setFormat(v as ContentFormat)}
      options={[
        { value: "plain", label: "Plain Text" },
        { value: "markdown", label: "Markdown" },
        { value: "html", label: "HTML" },
      ]}
    />
  );

  return (
    // @ts-expect-error - Modal is a class component with React type compatibility issues
    <Modal
      visible={isOpen}
      onHide={onClose}
      fullscreen={true}
      title="Reader View"
      header={headerContent}
      allowClose={true}
      closeOnClickOutside={false}
      className={styles.readerViewModal}
      data-testid="reader-view-modal"
    >
      <div className={styles.contentContainer}>{renderContent()}</div>
    </Modal>
  );
};
