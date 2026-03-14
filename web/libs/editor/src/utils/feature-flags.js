/**
 * Re-export for resolvers that do not resolve .ts from .js require() (e.g. in tests).
 * Prefer importing from "./feature-flags.ts" or let the bundler resolve "./feature-flags" to feature-flags.ts.
 */
export * from "./feature-flags";
