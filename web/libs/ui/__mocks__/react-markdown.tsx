import type React from "react";

/**
 * Mock react-markdown for Jest (ESM-only dependency causes parse errors in JSDOM).
 * Passthrough so components that use markdown still render in tests.
 */
const ReactMarkdown: React.FC<{ children: string; rehypePlugins?: unknown[]; components?: unknown }> = ({
  children,
}) => <div data-testid="react-markdown">{children}</div>;

export default ReactMarkdown;
