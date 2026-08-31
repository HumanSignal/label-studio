/**
 * Phosphor icons re-exported as a stable module boundary.
 *
 * This file is intentionally kept separate from the main icons barrel (index.ts).
 * During Vite HMR, any change to index.ts causes it to re-evaluate. If Phosphor
 * exports lived there, the module would get a new reference on every hot reload —
 * React would see unknown component types, remount the subtree, and trigger
 * blank-page rendering errors caught by error boundaries.
 *
 * By isolating the Phosphor re-exports here (a file that never changes), Vite
 * caches this module permanently during dev and HMR works correctly.
 *
 * Usage: import { ArrowRightIcon, IconContext } from "@humansignal/icons"
 */
export * from "@phosphor-icons/react";
