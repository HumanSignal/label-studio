import { type FC, useState, useMemo } from "react";
import sanitizeHtml from "sanitize-html";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Modal } from "../modal";
import { Tabs, TabsList, TabsTrigger } from "../tabs/tabs";
import styles from "./reader-view-modal.module.scss";

type ContentFormat = "plain" | "markdown" | "html";

export interface ReaderViewModalProps {
  content: string;
  isOpen: boolean;
  onClose: () => void;
}

// Custom markdown components with Tailwind styling
const markdownComponents: Components = {
  h1: (props) => <h1 className="text-display-small font-bold mb-wide mt-wider" {...props} />,
  h2: (props) => <h2 className="text-headline-large font-bold mb-base mt-wide" {...props} />,
  h3: (props) => <h3 className="text-headline-medium font-semibold mb-base mt-wide" {...props} />,
  h4: (props) => <h4 className="text-headline-small font-semibold mb-tight mt-base" {...props} />,
  h5: (props) => <h5 className="text-title-large font-semibold mb-tight mt-base" {...props} />,
  h6: (props) => <h6 className="text-title-medium font-semibold mb-tight mt-base" {...props} />,
  p: (props) => <p className="text-body-medium mb-base leading-body-medium" {...props} />,
  ul: (props) => <ul className="list-disc pl-base mb-base space-y-tighter" {...props} />,
  ol: (props) => <ol className="list-decimal pl-base mb-base space-y-tighter" {...props} />,
  li: (props) => <li className="text-body-medium pl-tight ml-base" {...props} />,
  code: ({ inline, ...props }: { inline?: boolean } & React.HTMLAttributes<HTMLElement>) => {
    if (inline) {
      return (
        <code
          className="bg-neutral-emphasis text-neutral-content px-tighter py-tightest rounded-smallest font-mono text-body-smaller"
          {...props}
        />
      );
    }
    return <code className="font-mono text-body-small" {...props} />;
  },
  pre: (props) => (
    <pre
      className="bg-neutral-surface-inset border border-neutral-border rounded-small p-base mb-base overflow-x-auto"
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote
      className="border-l-4 border-primary-border pl-base ml-base mb-base italic text-neutral-content-subtle"
      {...props}
    />
  ),
  a: (props) => <a className="text-primary-content hover:text-primary-content-hover underline" {...props} />,
  hr: (props) => <hr className="border-neutral-border my-wide" {...props} />,
  table: (props) => (
    <div className="overflow-x-auto mb-base">
      <table className="min-w-full border-collapse border border-neutral-border" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-neutral-surface" {...props} />,
  tbody: (props) => <tbody {...props} />,
  tr: (props) => <tr className="border-b border-neutral-border" {...props} />,
  th: (props) => (
    <th className="border border-neutral-border px-base py-tight text-left font-semibold text-body-medium" {...props} />
  ),
  td: (props) => <td className="border border-neutral-border px-base py-tight text-body-medium" {...props} />,
  strong: (props) => <strong className="font-bold" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  del: (props) => <del className="line-through text-neutral-content-subtle" {...props} />,
};

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
            <ReactMarkdown rehypePlugins={[rehypeRaw]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
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
    <Tabs value={format} onValueChange={(v) => setFormat(v as ContentFormat)} variant="default">
      <TabsList>
        <TabsTrigger value="plain">Plain Text</TabsTrigger>
        <TabsTrigger value="markdown">Markdown</TabsTrigger>
        <TabsTrigger value="html">HTML</TabsTrigger>
      </TabsList>
    </Tabs>
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
