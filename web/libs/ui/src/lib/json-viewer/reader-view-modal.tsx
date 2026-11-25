import { type FC, useState, useMemo } from "react";
import sanitizeHtml from "sanitize-html";
import { Markdown } from "../../../../editor/src/components/Markdown/Markdown";
import { ModalWindow } from "../modal-window/modal-window";
import { SegmentedControl } from "../segmented-control/segmented-control";
import { Typography } from "../typography/typography";
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

  const header = (
    <div className="flex items-center justify-between gap-base">
      <Typography variant="title" size="large" className="text-neutral-content" data-testid="modal-window-title">
        Reader View
      </Typography>
      <SegmentedControl
        size="small"
        aria-label="Format"
        selectedOption={format}
        onChange={(v) => setFormat(v as ContentFormat)}
        options={[
          { value: "plain", label: "Plain Text" },
          { value: "markdown", label: "Markdown" },
          { value: "html", label: "HTML" },
        ]}
      />
    </div>
  );

  return (
    <ModalWindow
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="fullscreen"
      title="Reader View"
      header={header}
      closeOnScrimClick={false}
      bodyClassName="flex min-h-0"
      dataTestId="reader-view-modal"
    >
      <div className={styles.contentContainer}>{renderContent()}</div>
    </ModalWindow>
  );
};
