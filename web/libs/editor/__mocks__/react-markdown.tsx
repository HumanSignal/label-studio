import type React from "react";

/**
 * Mock react-markdown for Jest tests
 *
 * react-markdown is ESM-only and causes Jest parsing errors when imported in tests.
 * We don't need to test the actual markdown rendering in unit tests - we only need
 * to verify that our components correctly pass content to the markdown renderer.
 *
 * This mock provides a simple passthrough that allows tests to run without
 * needing to transform the entire react-markdown dependency tree.
 */
const ReactMarkdown: React.FC<{ children: string; rehypePlugins?: unknown[]; components?: unknown }> = ({
  children,
}) => {
  return <div data-testid="react-markdown">{children}</div>;
};

export default ReactMarkdown;
