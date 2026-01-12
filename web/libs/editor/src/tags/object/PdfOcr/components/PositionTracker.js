/**
 * PositionTracker - Line number calculation from OCR tokens.
 *
 * Provides position tracking for PDF annotations by:
 * - Grouping OCR tokens into logical lines based on y-coordinates
 * - Calculating line numbers for token selections
 * - Generating position references with page, line, and fallback data
 *
 * @module PositionTracker
 */

/**
 * Default tolerance for grouping tokens into lines.
 * Tokens within this y-coordinate difference are considered same line.
 * Value is in normalized coordinates (0-1).
 */
export const DEFAULT_LINE_TOLERANCE = 0.015;

/**
 * Group OCR tokens into logical lines based on y-coordinate proximity.
 *
 * Algorithm:
 * 1. Sort tokens by y-coordinate (top to bottom)
 * 2. Group tokens where y-center difference < tolerance
 * 3. Assign sequential line numbers
 *
 * @param {Array<{id: string, text: string, bbox: number[]}>} tokens - OCR tokens with bbox [x, y, width, height]
 * @param {number} [tolerance=DEFAULT_LINE_TOLERANCE] - Y-coordinate tolerance for same-line grouping
 * @returns {Array<{lineNumber: number, tokens: Array, yMin: number, yMax: number, yCenter: number}>} Lines with tokens
 */
export function groupTokensIntoLines(tokens, tolerance = DEFAULT_LINE_TOLERANCE) {
  if (!tokens || tokens.length === 0) {
    return [];
  }

  // Calculate y-center for each token and sort by y
  const tokensWithY = tokens.map((token, index) => {
    const [x, y, width, height] = token.bbox;
    const yCenter = y + height / 2;
    return { token, yCenter, originalIndex: index };
  });

  // Sort by y-center (top to bottom)
  tokensWithY.sort((a, b) => a.yCenter - b.yCenter);

  const lines = [];
  let currentLine = null;

  for (const { token, yCenter } of tokensWithY) {
    if (!currentLine || Math.abs(yCenter - currentLine.yCenter) > tolerance) {
      // Start a new line
      currentLine = {
        tokens: [token],
        yMin: token.bbox[1],
        yMax: token.bbox[1] + token.bbox[3],
        yCenter: yCenter,
        yCenterSum: yCenter,
        tokenCount: 1,
      };
      lines.push(currentLine);
    } else {
      // Add to current line
      currentLine.tokens.push(token);
      currentLine.yMin = Math.min(currentLine.yMin, token.bbox[1]);
      currentLine.yMax = Math.max(currentLine.yMax, token.bbox[1] + token.bbox[3]);
      currentLine.yCenterSum += yCenter;
      currentLine.tokenCount++;
      // Update running average of yCenter
      currentLine.yCenter = currentLine.yCenterSum / currentLine.tokenCount;
    }
  }

  // Sort tokens within each line by x-coordinate (left to right)
  lines.forEach((line) => {
    line.tokens.sort((a, b) => a.bbox[0] - b.bbox[0]);
  });

  // Assign line numbers (1-based)
  return lines.map((line, index) => ({
    lineNumber: index + 1,
    tokens: line.tokens,
    yMin: line.yMin,
    yMax: line.yMax,
    yCenter: line.yCenter,
  }));
}

/**
 * Calculate the line number for a specific token.
 *
 * @param {Array<{id: string, text: string, bbox: number[]}>} tokens - All OCR tokens
 * @param {number} tokenIndex - Index of the target token in the tokens array
 * @param {number} [tolerance=DEFAULT_LINE_TOLERANCE] - Y-coordinate tolerance
 * @returns {number|null} Line number (1-based) or null if invalid
 */
export function calculateLineNumber(tokens, tokenIndex, tolerance = DEFAULT_LINE_TOLERANCE) {
  if (!tokens || tokens.length === 0) {
    return null;
  }

  if (tokenIndex < 0 || tokenIndex >= tokens.length) {
    return null;
  }

  const targetToken = tokens[tokenIndex];
  const lines = groupTokensIntoLines(tokens, tolerance);

  // Find which line contains the target token
  for (const line of lines) {
    const found = line.tokens.find((t) => t.id === targetToken.id);
    if (found) {
      return line.lineNumber;
    }
  }

  return null;
}

/**
 * Calculate character offset for a token range.
 * Sums the text length of all tokens before the target.
 *
 * @param {Array<{text: string}>} tokens - Tokens array
 * @param {number} tokenIndex - Target token index
 * @returns {number} Character offset
 */
function calculateCharacterOffset(tokens, tokenIndex) {
  let offset = 0;
  for (let i = 0; i < tokenIndex && i < tokens.length; i++) {
    offset += tokens[i].text.length + 1; // +1 for space between tokens
  }
  return offset;
}

/**
 * Generate a complete position reference for a token selection.
 *
 * Returns position data with:
 * - page: Required page number
 * - line: Line number if determinable
 * - lineEnd: End line number if multi-line selection
 * - startOffset/endOffset: Character offsets as fallback
 * - tokenStart/tokenEnd: Token indices for precise tracking
 *
 * @param {Object} options
 * @param {Array<{id: string, text: string, bbox: number[]}>} options.tokens - All OCR tokens for the page
 * @param {number} options.tokenStart - Start token index
 * @param {number} options.tokenEnd - End token index (inclusive)
 * @param {number} options.page - Page number (1-based)
 * @param {number} [options.tolerance=DEFAULT_LINE_TOLERANCE] - Line grouping tolerance
 * @returns {Object} Position reference object
 */
export function getPositionReference({
  tokens,
  tokenStart,
  tokenEnd,
  page,
  tolerance = DEFAULT_LINE_TOLERANCE,
}) {
  const position = {
    page,
    tokenStart,
    tokenEnd,
  };

  // Calculate character offsets as fallback
  position.startOffset = calculateCharacterOffset(tokens, tokenStart);
  position.endOffset = calculateCharacterOffset(tokens, tokenEnd + 1);

  // Try to calculate line numbers
  if (tokens && tokens.length > 0) {
    const startLine = calculateLineNumber(tokens, tokenStart, tolerance);
    const endLine = calculateLineNumber(tokens, tokenEnd, tolerance);

    if (startLine !== null) {
      position.line = startLine;

      // Only include lineEnd if different from start (multi-line selection)
      if (endLine !== null && endLine !== startLine) {
        position.lineEnd = endLine;
      }
    }
  }

  return position;
}

/**
 * Estimate paragraph index based on vertical gaps between lines.
 * Lines with gaps larger than threshold start new paragraphs.
 *
 * @param {Array<{id: string, text: string, bbox: number[]}>} tokens - All OCR tokens
 * @param {number} tokenIndex - Target token index
 * @param {number} [paragraphGapThreshold=0.05] - Vertical gap threshold for paragraph break
 * @returns {number|null} Paragraph index (1-based) or null
 */
export function calculateParagraphIndex(tokens, tokenIndex, paragraphGapThreshold = 0.05) {
  if (!tokens || tokens.length === 0 || tokenIndex < 0 || tokenIndex >= tokens.length) {
    return null;
  }

  const lines = groupTokensIntoLines(tokens);
  if (lines.length === 0) {
    return null;
  }

  let paragraphIndex = 1;
  let previousLineBottom = lines[0].yMax;

  // Find which line contains the target token
  const targetToken = tokens[tokenIndex];
  let targetLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const found = line.tokens.find((t) => t.id === targetToken.id);

    if (i > 0) {
      const gap = line.yMin - previousLineBottom;
      if (gap > paragraphGapThreshold) {
        paragraphIndex++;
      }
      previousLineBottom = line.yMax;
    }

    if (found) {
      targetLineIndex = i;
      break;
    }

    previousLineBottom = line.yMax;
  }

  return targetLineIndex >= 0 ? paragraphIndex : null;
}

export default {
  DEFAULT_LINE_TOLERANCE,
  groupTokensIntoLines,
  calculateLineNumber,
  getPositionReference,
  calculateParagraphIndex,
};
