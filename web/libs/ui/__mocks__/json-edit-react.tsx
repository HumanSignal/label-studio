import React from "react";
import { vi } from "vitest";

/** Stub that captures props for tests; real behavior is in JsonViewer, we test the filter it passes. */
export const JsonEditor = (props: Record<string, unknown>) => {
  (globalThis as any).__jsonEditorProps = (global as any).__jsonEditorProps = props;
  return <div data-testid="json-editor" />;
};
export const defaultTheme = { styles: {} };
export const matchNode = vi.fn(() => false);
