/**
 * PDF Selection Utility Unit Tests
 *
 * Tests for token-based text selection in PDFs.
 * Per Constitution Principle II: Tests written FIRST, must FAIL before implementation.
 */

import {
  findTokensInRect,
  getSelectedTokens,
  extractTextFromTokens,
  calculateBoundingBox,
  sortTokensByReadingOrder,
} from '../pdf-selection';

describe('pdf-selection', () => {
  // Sample OCR tokens with bbox [x, y, width, height] in normalized 0-1 coordinates
  const sampleTokens = [
    { id: 't1', text: 'Hello', bbox: [0.1, 0.1, 0.05, 0.02] },
    { id: 't2', text: 'World', bbox: [0.16, 0.1, 0.05, 0.02] },
    { id: 't3', text: 'This', bbox: [0.1, 0.15, 0.04, 0.02] },
    { id: 't4', text: 'is', bbox: [0.15, 0.15, 0.02, 0.02] },
    { id: 't5', text: 'a', bbox: [0.18, 0.15, 0.01, 0.02] },
    { id: 't6', text: 'test', bbox: [0.2, 0.15, 0.04, 0.02] },
  ];

  describe('findTokensInRect', () => {
    it('should find tokens that intersect with a rectangle', () => {
      // Rectangle that covers first two tokens
      const rect = { x: 0.08, y: 0.08, width: 0.15, height: 0.05 };
      const found = findTokensInRect(sampleTokens, rect);

      expect(found).toHaveLength(2);
      expect(found.map((t) => t.id)).toEqual(['t1', 't2']);
    });

    it('should return empty array when no tokens intersect', () => {
      const rect = { x: 0.5, y: 0.5, width: 0.1, height: 0.1 };
      const found = findTokensInRect(sampleTokens, rect);

      expect(found).toHaveLength(0);
    });

    it('should find tokens partially inside rectangle', () => {
      // Rectangle that partially overlaps first token
      const rect = { x: 0.12, y: 0.1, width: 0.02, height: 0.02 };
      const found = findTokensInRect(sampleTokens, rect);

      expect(found).toHaveLength(1);
      expect(found[0].id).toBe('t1');
    });

    it('should handle rectangle covering all tokens', () => {
      const rect = { x: 0, y: 0, width: 1, height: 1 };
      const found = findTokensInRect(sampleTokens, rect);

      expect(found).toHaveLength(sampleTokens.length);
    });

    it('should handle empty tokens array', () => {
      const rect = { x: 0.1, y: 0.1, width: 0.1, height: 0.1 };
      const found = findTokensInRect([], rect);

      expect(found).toHaveLength(0);
    });

    it('should work with percentage coordinates (0-100)', () => {
      const rect = { x: 8, y: 8, width: 15, height: 5 };
      const found = findTokensInRect(sampleTokens, rect, { normalized: false });

      expect(found).toHaveLength(2);
    });
  });

  describe('getSelectedTokens', () => {
    it('should return tokens between start and end indices', () => {
      const selected = getSelectedTokens(sampleTokens, 1, 4);

      expect(selected).toHaveLength(4);
      expect(selected[0].id).toBe('t2');
      expect(selected[3].id).toBe('t5');
    });

    it('should handle single token selection', () => {
      const selected = getSelectedTokens(sampleTokens, 2, 2);

      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('t3');
    });

    it('should handle reversed indices (swap automatically)', () => {
      const selected = getSelectedTokens(sampleTokens, 4, 1);

      expect(selected).toHaveLength(4);
      expect(selected[0].id).toBe('t2');
    });

    it('should clamp indices to valid range', () => {
      const selected = getSelectedTokens(sampleTokens, -5, 100);

      expect(selected).toHaveLength(sampleTokens.length);
    });

    it('should return empty array for empty tokens', () => {
      const selected = getSelectedTokens([], 0, 5);

      expect(selected).toHaveLength(0);
    });
  });

  describe('extractTextFromTokens', () => {
    it('should concatenate token text with spaces', () => {
      const text = extractTextFromTokens(sampleTokens.slice(0, 2));

      expect(text).toBe('Hello World');
    });

    it('should sort tokens by reading order before concatenating', () => {
      // Tokens out of order
      const unorderedTokens = [sampleTokens[1], sampleTokens[0]];
      const text = extractTextFromTokens(unorderedTokens);

      expect(text).toBe('Hello World');
    });

    it('should handle single token', () => {
      const text = extractTextFromTokens([sampleTokens[0]]);

      expect(text).toBe('Hello');
    });

    it('should handle empty array', () => {
      const text = extractTextFromTokens([]);

      expect(text).toBe('');
    });

    it('should handle tokens with special characters', () => {
      const specialTokens = [
        { id: 's1', text: 'Hello,', bbox: [0.1, 0.1, 0.05, 0.02] },
        { id: 's2', text: '"World"', bbox: [0.16, 0.1, 0.05, 0.02] },
      ];
      const text = extractTextFromTokens(specialTokens);

      expect(text).toBe('Hello, "World"');
    });

    it('should preserve Unicode characters', () => {
      const unicodeTokens = [
        { id: 'u1', text: 'Hong', bbox: [0.1, 0.1, 0.04, 0.02] },
        { id: 'u2', text: 'Kong', bbox: [0.15, 0.1, 0.04, 0.02] },
        { id: 'u3', text: '2025', bbox: [0.2, 0.1, 0.04, 0.02] },
      ];
      const text = extractTextFromTokens(unicodeTokens);

      expect(text).toBe('Hong Kong 2025');
    });
  });

  describe('calculateBoundingBox', () => {
    it('should calculate bounding box containing all tokens', () => {
      const bbox = calculateBoundingBox(sampleTokens.slice(0, 2));

      expect(bbox.x).toBeCloseTo(0.1); // leftmost x
      expect(bbox.y).toBeCloseTo(0.1); // topmost y
      expect(bbox.width).toBeCloseTo(0.11); // rightmost edge - leftmost x
      expect(bbox.height).toBeCloseTo(0.02); // same line, same height
    });

    it('should handle multi-line tokens', () => {
      const bbox = calculateBoundingBox(sampleTokens);

      expect(bbox.x).toBe(0.1);
      expect(bbox.y).toBe(0.1);
      // Should extend to cover all tokens
      expect(bbox.width).toBeGreaterThan(0.1);
      expect(bbox.height).toBeGreaterThan(0.05);
    });

    it('should return null for empty array', () => {
      const bbox = calculateBoundingBox([]);

      expect(bbox).toBeNull();
    });

    it('should handle single token', () => {
      const bbox = calculateBoundingBox([sampleTokens[0]]);

      expect(bbox.x).toBeCloseTo(0.1);
      expect(bbox.y).toBeCloseTo(0.1);
      expect(bbox.width).toBeCloseTo(0.05);
      expect(bbox.height).toBeCloseTo(0.02);
    });
  });

  describe('sortTokensByReadingOrder', () => {
    it('should sort tokens top-to-bottom, left-to-right', () => {
      const unsorted = [sampleTokens[5], sampleTokens[0], sampleTokens[3]];
      const sorted = sortTokensByReadingOrder(unsorted);

      expect(sorted[0].id).toBe('t1'); // Line 1, leftmost
      expect(sorted[1].id).toBe('t4'); // Line 2
      expect(sorted[2].id).toBe('t6'); // Line 2, rightmost
    });

    it('should keep tokens on same line sorted left-to-right', () => {
      const sameLine = [sampleTokens[1], sampleTokens[0]];
      const sorted = sortTokensByReadingOrder(sameLine);

      expect(sorted[0].id).toBe('t1');
      expect(sorted[1].id).toBe('t2');
    });

    it('should handle empty array', () => {
      const sorted = sortTokensByReadingOrder([]);

      expect(sorted).toHaveLength(0);
    });

    it('should not mutate original array', () => {
      const original = [...sampleTokens];
      const originalIds = original.map((t) => t.id);

      sortTokensByReadingOrder(original);

      expect(original.map((t) => t.id)).toEqual(originalIds);
    });
  });
});
