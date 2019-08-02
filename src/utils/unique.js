import nanoid from "nanoid";

/**
 * Unique hash generator
 */
export function guidGenerator() {
  const uniqueID = nanoid(10);
  return uniqueID;
}
