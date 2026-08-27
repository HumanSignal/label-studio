/** Shared telemetry payload shape (OSS contract — transport lives in LSE). */
export type TelemetryPayload = {
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
};

/** Optional dedupe / rate-limit hints passed to the LSE implementation. */
export type EmitEventOptions = {
  /** Dedupe identity; defaults to the event name. */
  dedupeKey?: string;
  /** Per-key dedupe window in ms (default 60_000). */
  ttlMs?: number;
};

export type EmitPageviewOptions = {
  softNavigation?: boolean;
};

/**
 * LSE registers this on `globalThis.__hsTelemetry` at boot.
 * LSO exports a pass-through API so shared code never imports SaaS details.
 */
export type HsTelemetry = {
  isEnabled(): boolean;
  emitEvent(eventName: string, properties?: Record<string, unknown>, options?: EmitEventOptions): boolean;
  initAutoPageview(): () => void;
  emitPageview?(pathname?: string, options?: EmitPageviewOptions): void;
  getClientContext?(): Record<string, unknown>;
  getAllFeatureFlagStates?(): Record<string, boolean>;
  getFeatureFlagStates?(flagKeys?: string[]): Record<string, boolean>;
  getDocumentLoadPerfProps?(): Record<string, number | string>;
  resetPageviewStateForTests?(): void;
  resetFloodGuardForTests?(): void;
  refreshSessionJwt?(): Promise<string | null>;
};

const HS_TELEMETRY_KEY = "__hsTelemetry";

export function getHsTelemetry(): HsTelemetry | undefined {
  if (typeof globalThis === "undefined") {
    return undefined;
  }
  return (globalThis as typeof globalThis & { [HS_TELEMETRY_KEY]?: HsTelemetry })[HS_TELEMETRY_KEY];
}

export function setHsTelemetry(impl: HsTelemetry | undefined): void {
  if (typeof globalThis === "undefined") {
    return;
  }
  (globalThis as typeof globalThis & { [HS_TELEMETRY_KEY]?: HsTelemetry })[HS_TELEMETRY_KEY] = impl;
}
