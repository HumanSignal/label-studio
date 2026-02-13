/**
 * Re-exports of lodash-replacement utilities from es-toolkit.
 * Uses es-toolkit/compat for lodash-compatible API (string keys in uniqBy, NaN handling in clamp, etc.).
 */

export { throttle, clamp, get, isMatch, uniqBy } from "es-toolkit/compat";
