import nanoid from "nanoid";

/**
 * Unique hash generator
 * @param {number} lgth
 */
export function guidGenerator(lgth) {
  let uniqueID = nanoid(10);

  if (lgth) {
    uniqueID = nanoid(lgth);
  }

  return uniqueID;
}
