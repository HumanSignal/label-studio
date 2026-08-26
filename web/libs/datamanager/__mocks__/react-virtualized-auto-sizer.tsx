import type React from "react";

/**
 * Minimal mock for Vitest so CodeView gets a valid AutoSizer when the real
 * package has default export interop issues in the test env.
 */
interface AutoSizerProps {
  children: (size: { height: number; width: number }) => React.ReactNode;
}

export default function AutoSizer({ children }: AutoSizerProps) {
  return <>{children({ height: 400, width: 800 })}</>;
}
