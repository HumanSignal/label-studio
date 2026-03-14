/**
 * Re-export for resolvers that do not resolve .ts from .js importers (e.g. in tests).
 * Prefer importing from "./utilities.ts" or let the bundler resolve "./utilities" to utilities.ts.
 */
export * from "./utilities.ts";
