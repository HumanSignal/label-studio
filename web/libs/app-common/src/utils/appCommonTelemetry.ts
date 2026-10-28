import { emitEvent } from "@humansignal/core/telemetry";

/**
 * app-common telemetry gateway — the **only** module in app-common that may import core/telemetry.
 *
 * Defers ingest (setTimeout 0) and swallows errors so tracking never interleaves with product
 * state updates or throws into product paths. Pass ids, enums and counts only.
 * See `.agents/rules/telemetry-no-product-coupling.md`.
 */
export function emitAppCommonEvent(eventName: string, properties: Record<string, unknown> = {}): void {
  setTimeout(() => {
    try {
      void emitEvent(eventName, properties);
    } catch {
      // Observe-only — never surface telemetry failures to product code.
    }
  }, 0);
}
