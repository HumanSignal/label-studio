/**
 * Side-effect entry for app bootstrap.
 *
 * Import this module *before* `./app/App` in main.tsx so ESM evaluates it
 * (and calls bootstrap) before App's top-level `render()`. Module-body
 * `effectiveHotkeys.bootstrap()` after App imports is too late — imports hoist.
 */
import { effectiveHotkeys } from "./effectiveHotkeys";

effectiveHotkeys.bootstrap();
