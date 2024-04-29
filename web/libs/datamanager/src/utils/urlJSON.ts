/**
 * Library that serializes and deserializes JSON data to/from URL-safe strings
 * using gzip to minimize the size of the serialized data.
 */

import { gzip, ungzip } from "pako";
import { fromUint8Array, toUint8Array } from "js-base64";
import { packJSON } from "./packJSON";

export const deserializeJsonFromUrl = (s: string): unknown => {
  // Fall back to packJSON if deserialization fails; this probably means
  // we are deserializing an old virtual view. TODO(jo): deprecate packJSON entirely
  try {
    return JSON.parse(ungzip(toUint8Array(s), { to: "string" }));
  } catch (e) {
    console.log("Error deserializing gzipped data:", e);
    console.log("falling back to packJSON.");
    return packJSON.parse(s);
  }
};

export const serializeJsonForUrl = (o: object) => fromUint8Array(gzip(JSON.stringify(o)), true);
