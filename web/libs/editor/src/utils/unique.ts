// @todo for nanoid@3 there should be default import
import { nanoid } from 'nanoid';

/**
 * Unique hash generator
 * @param {number} lgth
 */
export const guidGenerator = (length = 10) => nanoid(length);
