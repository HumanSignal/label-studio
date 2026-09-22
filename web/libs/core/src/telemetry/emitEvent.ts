import { getHsTelemetry, type EmitEventOptions, type EmitPageviewOptions } from "./contract";

/** Re-exported for LSE registration and product code typing. */
export type { EmitEventOptions, EmitPageviewOptions } from "./contract";

export function isCloudInstance(): boolean {
  try {
    return getHsTelemetry()?.isEnabled() ?? false;
  } catch {
    return false;
  }
}

export function getClientContext(): Record<string, unknown> {
  try {
    return getHsTelemetry()?.getClientContext?.() ?? { $lib: "hs-telemetry-web-sdk", $lib_version: "1.0.0" };
  } catch {
    return { $lib: "hs-telemetry-web-sdk", $lib_version: "1.0.0" };
  }
}

export function getAllFeatureFlagStates(): Record<string, boolean> {
  try {
    return getHsTelemetry()?.getAllFeatureFlagStates?.() ?? {};
  } catch {
    return {};
  }
}

/** @deprecated Prefer getAllFeatureFlagStates() + pageview-level capture. */
export function getFeatureFlagStates(flagKeys?: string[]): Record<string, boolean> {
  try {
    return getHsTelemetry()?.getFeatureFlagStates?.(flagKeys) ?? {};
  } catch {
    return {};
  }
}

export function getDocumentLoadPerfProps(): Record<string, number | string> {
  try {
    return getHsTelemetry()?.getDocumentLoadPerfProps?.() ?? {};
  } catch {
    return {};
  }
}

export function emitEvent(
  eventName: string,
  properties: Record<string, unknown> = {},
  options?: EmitEventOptions,
): boolean {
  try {
    return getHsTelemetry()?.emitEvent(eventName, properties, options) ?? false;
  } catch {
    return false;
  }
}

/** Test-only: reset module pageview state between cases. */
export function resetPageviewStateForTests(): void {
  try {
    getHsTelemetry()?.resetPageviewStateForTests?.();
  } catch {
    // OSS / tests without LSE registration — no-op.
  }
}

export function emitPageview(pathname?: string, options: EmitPageviewOptions = {}): void {
  try {
    getHsTelemetry()?.emitPageview?.(pathname, options);
  } catch {
    // OSS — no-op.
  }
}

export function initAutoPageview(): () => void {
  try {
    return getHsTelemetry()?.initAutoPageview() ?? (() => {});
  } catch {
    return () => {};
  }
}
