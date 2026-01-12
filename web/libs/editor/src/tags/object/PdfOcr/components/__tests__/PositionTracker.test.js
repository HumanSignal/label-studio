/**
 * PositionTracker Unit Tests
 *
 * Tests for line number calculation from OCR tokens.
 * Per Constitution Principle II: Tests written FIRST, must FAIL before implementation.
 */

import {
  calculateLineNumber,
  groupTokensIntoLines,
  getPositionReference,
  DEFAULT_LINE_TOLERANCE,
} from '../PositionTracker';

describe('PositionTracker', () => {
  // Sample OCR tokens with bbox [x, y, width, height] in normalized 0-1 coordinates
  const sampleTokens = [
    { id: 't1', text: 'Hello', bbox: [0.1, 0.1, 0.05, 0.02] },      // Line 1
    { id: 't2', text: 'World', bbox: [0.16, 0.1, 0.05, 0.02] },     // Line 1
    { id: 't3', text: 'This', bbox: [0.1, 0.15, 0.04, 0.02] },      // Line 2
    { id: 't4', text: 'is', bbox: [0.15, 0.15, 0.02, 0.02] },       // Line 2
    { id: 't5', text: 'line', bbox: [0.18, 0.15, 0.04, 0.02] },     // Line 2
    { id: 't6', text: 'two', bbox: [0.23, 0.15, 0.03, 0.02] },      // Line 2
    { id: 't7', text: 'Third', bbox: [0.1, 0.2, 0.05, 0.02] },      // Line 3
    { id: 't8', text: 'line', bbox: [0.16, 0.2, 0.04, 0.02] },      // Line 3
  ];

  describe('groupTokensIntoLines', () => {
    it('should group tokens with similar y-coordinates into lines', () => {
      const lines = groupTokensIntoLines(sampleTokens);

      expect(lines).toHaveLength(3);
      expect(lines[0].tokens).toHaveLength(2); // Line 1: Hello, World
      expect(lines[1].tokens).toHaveLength(4); // Line 2: This, is, line, two
      expect(lines[2].tokens).toHaveLength(2); // Line 3: Third, line
    });

    it('should assign sequential line numbers starting from 1', () => {
      const lines = groupTokensIntoLines(sampleTokens);

      expect(lines[0].lineNumber).toBe(1);
      expect(lines[1].lineNumber).toBe(2);
      expect(lines[2].lineNumber).toBe(3);
    });

    it('should sort lines by y-coordinate (top to bottom)', () => {
      const lines = groupTokensIntoLines(sampleTokens);

      expect(lines[0].yCenter).toBeLessThan(lines[1].yCenter);
      expect(lines[1].yCenter).toBeLessThan(lines[2].yCenter);
    });

    it('should handle empty token array', () => {
      const lines = groupTokensIntoLines([]);

      expect(lines).toHaveLength(0);
    });

    it('should handle single token', () => {
      const lines = groupTokensIntoLines([sampleTokens[0]]);

      expect(lines).toHaveLength(1);
      expect(lines[0].lineNumber).toBe(1);
      expect(lines[0].tokens).toHaveLength(1);
    });

    it('should use custom tolerance when provided', () => {
      // Tokens very close together vertically
      const closeTokens = [
        { id: 't1', text: 'A', bbox: [0.1, 0.1, 0.02, 0.02] },
        { id: 't2', text: 'B', bbox: [0.15, 0.105, 0.02, 0.02] }, // 0.005 difference
      ];

      // With tight tolerance, they should be separate lines
      const linesWithTightTolerance = groupTokensIntoLines(closeTokens, 0.001);
      expect(linesWithTightTolerance).toHaveLength(2);

      // With loose tolerance, they should be same line
      const linesWithLooseTolerance = groupTokensIntoLines(closeTokens, 0.01);
      expect(linesWithLooseTolerance).toHaveLength(1);
    });
  });

  describe('calculateLineNumber', () => {
    it('should return correct line number for a token', () => {
      const lineNum = calculateLineNumber(sampleTokens, 0); // First token (Hello)
      expect(lineNum).toBe(1);

      const lineNum2 = calculateLineNumber(sampleTokens, 2); // Third token (This)
      expect(lineNum2).toBe(2);

      const lineNum3 = calculateLineNumber(sampleTokens, 6); // Seventh token (Third)
      expect(lineNum3).toBe(3);
    });

    it('should return null for invalid token index', () => {
      expect(calculateLineNumber(sampleTokens, -1)).toBeNull();
      expect(calculateLineNumber(sampleTokens, 100)).toBeNull();
    });

    it('should return null for empty tokens array', () => {
      expect(calculateLineNumber([], 0)).toBeNull();
    });
  });

  describe('getPositionReference', () => {
    it('should return position with page and line number', () => {
      const position = getPositionReference({
        tokens: sampleTokens,
        tokenStart: 0,
        tokenEnd: 1,
        page: 1,
      });

      expect(position.page).toBe(1);
      expect(position.line).toBe(1);
      expect(position.tokenStart).toBe(0);
      expect(position.tokenEnd).toBe(1);
    });

    it('should return line range for multi-line selection', () => {
      const position = getPositionReference({
        tokens: sampleTokens,
        tokenStart: 0, // Line 1
        tokenEnd: 5,   // Line 2
        page: 2,
      });

      expect(position.page).toBe(2);
      expect(position.line).toBe(1);
      expect(position.lineEnd).toBe(2);
    });

    it('should include character offsets as fallback', () => {
      const position = getPositionReference({
        tokens: sampleTokens,
        tokenStart: 2,
        tokenEnd: 5,
        page: 1,
      });

      expect(position.startOffset).toBeDefined();
      expect(position.endOffset).toBeDefined();
      expect(typeof position.startOffset).toBe('number');
    });

    it('should handle single token selection', () => {
      const position = getPositionReference({
        tokens: sampleTokens,
        tokenStart: 3,
        tokenEnd: 3,
        page: 1,
      });

      expect(position.line).toBe(2);
      expect(position.lineEnd).toBeUndefined(); // Same line, no range
    });

    it('should fall back gracefully when line detection fails', () => {
      // Tokens with erratic y-values (simulating OCR issues)
      const erraticTokens = [
        { id: 't1', text: 'A', bbox: [0.1, 0.1, 0.02, 0.02] },
        { id: 't2', text: 'B', bbox: [0.2, 0.5, 0.02, 0.02] },
        { id: 't3', text: 'C', bbox: [0.3, 0.2, 0.02, 0.02] },
      ];

      const position = getPositionReference({
        tokens: erraticTokens,
        tokenStart: 0,
        tokenEnd: 2,
        page: 1,
      });

      // Should still have page and token indices even if line is uncertain
      expect(position.page).toBe(1);
      expect(position.tokenStart).toBe(0);
      expect(position.tokenEnd).toBe(2);
    });
  });

  describe('DEFAULT_LINE_TOLERANCE', () => {
    it('should be a reasonable default value', () => {
      expect(DEFAULT_LINE_TOLERANCE).toBeGreaterThan(0);
      expect(DEFAULT_LINE_TOLERANCE).toBeLessThan(0.1); // Should be small percentage
    });
  });
});
