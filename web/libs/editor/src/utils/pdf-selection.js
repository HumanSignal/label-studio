/**
 * PDF Selection Utilities - Token-based text selection for PDFs.
 *
 * Provides utilities for:
 * - Finding tokens within a selection rectangle
 * - Extracting text from token ranges
 * - Calculating bounding boxes for token sets
 * - Sorting tokens by reading order
 *
 * @module pdf-selection
 */

/**
 * Check if two rectangles intersect (AABB collision).
 *
 * @param {Object} rect1 - First rectangle {x, y, width, height}
 * @param {Object} rect2 - Second rectangle {x, y, width, height}
 * @returns {boolean} True if rectangles intersect
 */
function rectsIntersect(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

/**
 * Convert token bbox array to rectangle object.
 *
 * @param {number[]} bbox - [x, y, width, height]
 * @param {boolean} normalized - If true, bbox is 0-1; if false, 0-100
 * @returns {Object} Rectangle {x, y, width, height}
 */
function bboxToRect(bbox, normalized = true) {
  const [x, y, width, height] = bbox;
  const scale = normalized ? 1 : 100;
  return {
    x: x * scale,
    y: y * scale,
    width: width * scale,
    height: height * scale,
  };
}

/**
 * Find all tokens that intersect with a selection rectangle.
 *
 * @param {Array<{id: string, text: string, bbox: number[]}>} tokens - OCR tokens
 * @param {Object} rect - Selection rectangle {x, y, width, height}
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.normalized=true] - If true, rect is in 0-1 coords; tokens are always 0-1
 * @returns {Array} Tokens that intersect with the rectangle
 */
export function findTokensInRect(tokens, rect, options = {}) {
  const { normalized = true } = options;

  if (!tokens || tokens.length === 0) {
    return [];
  }

  // Normalize rect to 0-1 coordinates if needed
  const normalizedRect = normalized
    ? rect
    : {
        x: rect.x / 100,
        y: rect.y / 100,
        width: rect.width / 100,
        height: rect.height / 100,
      };

  return tokens.filter((token) => {
    const tokenRect = bboxToRect(token.bbox, true);
    return rectsIntersect(normalizedRect, tokenRect);
  });
}

/**
 * Get tokens between start and end indices (inclusive).
 *
 * @param {Array} tokens - All tokens
 * @param {number} startIndex - Start index
 * @param {number} endIndex - End index (inclusive)
 * @returns {Array} Selected tokens
 */
export function getSelectedTokens(tokens, startIndex, endIndex) {
  if (!tokens || tokens.length === 0) {
    return [];
  }

  // Handle reversed indices
  const start = Math.min(startIndex, endIndex);
  const end = Math.max(startIndex, endIndex);

  // Clamp to valid range
  const clampedStart = Math.max(0, start);
  const clampedEnd = Math.min(tokens.length - 1, end);

  return tokens.slice(clampedStart, clampedEnd + 1);
}

/**
 * Sort tokens by reading order (top-to-bottom, left-to-right).
 *
 * Tokens are sorted primarily by y-coordinate (with tolerance for same line),
 * then by x-coordinate within the same line.
 *
 * @param {Array<{bbox: number[]}>} tokens - Tokens to sort
 * @param {number} [lineTolerance=0.015] - Y-coordinate tolerance for same line
 * @returns {Array} Sorted tokens (new array, original unchanged)
 */
export function sortTokensByReadingOrder(tokens, lineTolerance = 0.015) {
  if (!tokens || tokens.length === 0) {
    return [];
  }

  // Create copy to avoid mutating original
  return [...tokens].sort((a, b) => {
    const [ax, ay] = a.bbox;
    const [bx, by] = b.bbox;

    // If y difference is within tolerance, consider same line and sort by x
    const yDiff = ay - by;
    if (Math.abs(yDiff) <= lineTolerance) {
      return ax - bx;
    }

    // Otherwise sort by y (top to bottom)
    return yDiff;
  });
}

/**
 * Extract text from a set of tokens.
 *
 * Tokens are sorted by reading order before concatenation.
 *
 * @param {Array<{text: string, bbox: number[]}>} tokens - Tokens to extract text from
 * @param {string} [separator=' '] - Separator between token texts
 * @returns {string} Concatenated text
 */
export function extractTextFromTokens(tokens, separator = ' ') {
  if (!tokens || tokens.length === 0) {
    return '';
  }

  const sorted = sortTokensByReadingOrder(tokens);
  return sorted.map((t) => t.text).join(separator);
}

/**
 * Calculate the bounding box that contains all tokens.
 *
 * @param {Array<{bbox: number[]}>} tokens - Tokens
 * @returns {Object|null} Bounding box {x, y, width, height} in normalized 0-1 coords, or null if empty
 */
export function calculateBoundingBox(tokens) {
  if (!tokens || tokens.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const token of tokens) {
    const [x, y, width, height] = token.bbox;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Find the token index closest to a point.
 *
 * @param {Array<{bbox: number[]}>} tokens - Tokens
 * @param {number} x - X coordinate (0-1 normalized)
 * @param {number} y - Y coordinate (0-1 normalized)
 * @returns {number} Index of closest token, or -1 if no tokens
 */
export function findClosestToken(tokens, x, y) {
  if (!tokens || tokens.length === 0) {
    return -1;
  }

  let closestIndex = 0;
  let closestDistance = Infinity;

  tokens.forEach((token, index) => {
    const [tx, ty, tw, th] = token.bbox;
    const centerX = tx + tw / 2;
    const centerY = ty + th / 2;

    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

/**
 * Get token indices that intersect with a selection rectangle.
 *
 * @param {Array} tokens - All tokens
 * @param {Object} rect - Selection rectangle
 * @param {Object} [options] - Options for findTokensInRect
 * @returns {{startIndex: number, endIndex: number}|null} Start and end indices, or null if none found
 */
export function getTokenIndicesInRect(tokens, rect, options) {
  const intersecting = findTokensInRect(tokens, rect, options);

  if (intersecting.length === 0) {
    return null;
  }

  // Find indices in original array
  const indices = intersecting.map((t) => tokens.findIndex((tok) => tok.id === t.id));
  const validIndices = indices.filter((i) => i >= 0);

  if (validIndices.length === 0) {
    return null;
  }

  return {
    startIndex: Math.min(...validIndices),
    endIndex: Math.max(...validIndices),
  };
}

/**
 * Create a selection result from tokens.
 *
 * @param {Array} tokens - All tokens
 * @param {number} startIndex - Start token index
 * @param {number} endIndex - End token index
 * @returns {Object} Selection result with text, tokens, and bounding box
 */
export function createSelectionResult(tokens, startIndex, endIndex) {
  const selectedTokens = getSelectedTokens(tokens, startIndex, endIndex);
  const text = extractTextFromTokens(selectedTokens);
  const boundingBox = calculateBoundingBox(selectedTokens);

  return {
    text,
    tokens: selectedTokens,
    tokenStart: Math.min(startIndex, endIndex),
    tokenEnd: Math.max(startIndex, endIndex),
    boundingBox,
  };
}

export default {
  findTokensInRect,
  getSelectedTokens,
  extractTextFromTokens,
  calculateBoundingBox,
  sortTokensByReadingOrder,
  findClosestToken,
  getTokenIndicesInRect,
  createSelectionResult,
};
