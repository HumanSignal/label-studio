import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeRaw from "rehype-raw";

// Custom markdown components with Tailwind styling
const markdownComponents: Components = {
  // Headings
  h1: (props) => <h1 className="text-display-small font-bold mb-wide mt-wider" {...props} />,
  h2: (props) => <h2 className="text-headline-large font-bold mb-base mt-wide" {...props} />,
  h3: (props) => <h3 className="text-headline-medium font-semibold mb-base mt-wide" {...props} />,
  h4: (props) => <h4 className="text-headline-small font-semibold mb-tight mt-base" {...props} />,
  h5: (props) => <h5 className="text-title-large font-semibold mb-tight mt-base" {...props} />,
  h6: (props) => <h6 className="text-title-medium font-semibold mb-tight mt-base" {...props} />,

  // Paragraphs
  p: (props) => <p className="text-body-medium mb-base leading-body-medium" {...props} />,

  // Lists
  ul: (props) => <ul className="list-disc pl-base mb-base space-y-tighter" {...props} />,
  ol: (props) => <ol className="list-decimal pl-base mb-base space-y-tighter" {...props} />,
  li: (props) => <li className="text-body-medium pl-tight ml-base" {...props} />,

  // Code
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

  // Blockquotes
  blockquote: (props) => (
    <blockquote
      className="border-l-4 border-primary-border pl-base ml-base mb-base italic text-neutral-content-subtle"
      {...props}
    />
  ),

  // Links
  a: (props) => <a className="text-primary-content hover:text-primary-content-hover underline" {...props} />,

  // Horizontal rule
  hr: (props) => <hr className="border-neutral-border my-wide" {...props} />,

  // Tables
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

  // Strong and emphasis
  strong: (props) => <strong className="font-bold" {...props} />,
  em: (props) => <em className="italic" {...props} />,

  // Strikethrough
  del: (props) => <del className="line-through text-neutral-content-subtle" {...props} />,
};

interface MarkdownProps {
  text: string;
  allowHtml?: boolean;
}

export const Markdown = ({ text, allowHtml = false }: MarkdownProps) => {
  return (
    <ReactMarkdown rehypePlugins={allowHtml ? [rehypeRaw] : undefined} components={markdownComponents}>
      {text}
    </ReactMarkdown>
  );
};
