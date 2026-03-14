/**
 * Jest compatibility: expose vi as global jest so existing tests using jest.fn(), jest.mock(), etc. keep working.
 */
import { vi } from "vitest";

(globalThis as unknown as { jest: typeof vi }).jest = vi;
