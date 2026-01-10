/**
 * Unit tests for KeyboardNav utility
 *
 * Tests keyboard navigation logic for table cells:
 * - Arrow key navigation (Up, Down, Left, Right)
 * - Tab/Shift+Tab navigation
 * - Enter to edit
 * - Escape to cancel
 * - Edge case handling (boundaries, wrapping)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock KeyboardNav module (to be implemented)
import { KeyboardNav, getNextCell, getPreviousCell } from '../../src/components/TableEditor/KeyboardNav';

describe('KeyboardNav', () => {
  // Sample 3x3 table structure
  const table = {
    numRows: 3,
    numCols: 3,
    cells: [
      [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
      [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
      [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }],
    ],
  };

  describe('getNextCell', () => {
    it('should move right within the same row', () => {
      const current = { row: 0, col: 0 };
      const next = getNextCell(table, current, 'ArrowRight');
      expect(next).toEqual({ row: 0, col: 1 });
    });

    it('should wrap to next row when at end of column', () => {
      const current = { row: 0, col: 2 };
      const next = getNextCell(table, current, 'Tab');
      expect(next).toEqual({ row: 1, col: 0 });
    });

    it('should move down within the same column', () => {
      const current = { row: 0, col: 1 };
      const next = getNextCell(table, current, 'ArrowDown');
      expect(next).toEqual({ row: 1, col: 1 });
    });

    it('should not move beyond right boundary with ArrowRight', () => {
      const current = { row: 0, col: 2 };
      const next = getNextCell(table, current, 'ArrowRight');
      expect(next).toEqual({ row: 0, col: 2 }); // Stay in place
    });

    it('should not move beyond bottom boundary with ArrowDown', () => {
      const current = { row: 2, col: 1 };
      const next = getNextCell(table, current, 'ArrowDown');
      expect(next).toEqual({ row: 2, col: 1 }); // Stay in place
    });

    it('should stay at last cell when Tab at end of table', () => {
      const current = { row: 2, col: 2 };
      const next = getNextCell(table, current, 'Tab');
      expect(next).toEqual({ row: 2, col: 2 }); // Stay in place
    });
  });

  describe('getPreviousCell', () => {
    it('should move left within the same row', () => {
      const current = { row: 0, col: 2 };
      const next = getPreviousCell(table, current, 'ArrowLeft');
      expect(next).toEqual({ row: 0, col: 1 });
    });

    it('should wrap to previous row when at start of column', () => {
      const current = { row: 1, col: 0 };
      const next = getPreviousCell(table, current, 'Shift+Tab');
      expect(next).toEqual({ row: 0, col: 2 });
    });

    it('should move up within the same column', () => {
      const current = { row: 2, col: 1 };
      const next = getPreviousCell(table, current, 'ArrowUp');
      expect(next).toEqual({ row: 1, col: 1 });
    });

    it('should not move beyond left boundary with ArrowLeft', () => {
      const current = { row: 0, col: 0 };
      const next = getPreviousCell(table, current, 'ArrowLeft');
      expect(next).toEqual({ row: 0, col: 0 }); // Stay in place
    });

    it('should not move beyond top boundary with ArrowUp', () => {
      const current = { row: 0, col: 1 };
      const next = getPreviousCell(table, current, 'ArrowUp');
      expect(next).toEqual({ row: 0, col: 1 }); // Stay in place
    });

    it('should stay at first cell when Shift+Tab at start', () => {
      const current = { row: 0, col: 0 };
      const next = getPreviousCell(table, current, 'Shift+Tab');
      expect(next).toEqual({ row: 0, col: 0 }); // Stay in place
    });
  });

  describe('KeyboardNav component', () => {
    let onNavigate;
    let onStartEdit;
    let onCancelEdit;
    let onConfirmEdit;

    beforeEach(() => {
      onNavigate = vi.fn();
      onStartEdit = vi.fn();
      onCancelEdit = vi.fn();
      onConfirmEdit = vi.fn();
    });

    it('should call onNavigate with new cell on ArrowRight', () => {
      const nav = new KeyboardNav({
        table,
        currentCell: { row: 0, col: 0 },
        onNavigate,
        onStartEdit,
        onCancelEdit,
        onConfirmEdit,
      });

      nav.handleKeyDown({ key: 'ArrowRight', preventDefault: vi.fn() });
      expect(onNavigate).toHaveBeenCalledWith({ row: 0, col: 1 });
    });

    it('should call onNavigate with new cell on ArrowDown', () => {
      const nav = new KeyboardNav({
        table,
        currentCell: { row: 0, col: 1 },
        onNavigate,
        onStartEdit,
        onCancelEdit,
        onConfirmEdit,
      });

      nav.handleKeyDown({ key: 'ArrowDown', preventDefault: vi.fn() });
      expect(onNavigate).toHaveBeenCalledWith({ row: 1, col: 1 });
    });

    it('should call onNavigate with next cell on Tab', () => {
      const nav = new KeyboardNav({
        table,
        currentCell: { row: 0, col: 2 },
        onNavigate,
        onStartEdit,
        onCancelEdit,
        onConfirmEdit,
      });

      nav.handleKeyDown({ key: 'Tab', shiftKey: false, preventDefault: vi.fn() });
      expect(onNavigate).toHaveBeenCalledWith({ row: 1, col: 0 });
    });

    it('should call onNavigate with previous cell on Shift+Tab', () => {
      const nav = new KeyboardNav({
        table,
        currentCell: { row: 1, col: 0 },
        onNavigate,
        onStartEdit,
        onCancelEdit,
        onConfirmEdit,
      });

      nav.handleKeyDown({ key: 'Tab', shiftKey: true, preventDefault: vi.fn() });
      expect(onNavigate).toHaveBeenCalledWith({ row: 0, col: 2 });
    });

    it('should call onStartEdit on Enter key', () => {
      const nav = new KeyboardNav({
        table,
        currentCell: { row: 1, col: 1 },
        onNavigate,
        onStartEdit,
        onCancelEdit,
        onConfirmEdit,
      });

      nav.handleKeyDown({ key: 'Enter', preventDefault: vi.fn() });
      expect(onStartEdit).toHaveBeenCalled();
    });

    it('should call onCancelEdit on Escape key when editing', () => {
      const nav = new KeyboardNav({
        table,
        currentCell: { row: 1, col: 1 },
        isEditing: true,
        onNavigate,
        onStartEdit,
        onCancelEdit,
        onConfirmEdit,
      });

      nav.handleKeyDown({ key: 'Escape', preventDefault: vi.fn() });
      expect(onCancelEdit).toHaveBeenCalled();
    });

    it('should call onConfirmEdit on Enter key when editing', () => {
      const nav = new KeyboardNav({
        table,
        currentCell: { row: 1, col: 1 },
        isEditing: true,
        onNavigate,
        onStartEdit,
        onCancelEdit,
        onConfirmEdit,
      });

      nav.handleKeyDown({ key: 'Enter', preventDefault: vi.fn() });
      expect(onConfirmEdit).toHaveBeenCalled();
    });

    it('should not navigate when editing (except Tab)', () => {
      const nav = new KeyboardNav({
        table,
        currentCell: { row: 1, col: 1 },
        isEditing: true,
        onNavigate,
        onStartEdit,
        onCancelEdit,
        onConfirmEdit,
      });

      nav.handleKeyDown({ key: 'ArrowRight', preventDefault: vi.fn() });
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('should confirm and navigate on Tab when editing', () => {
      const nav = new KeyboardNav({
        table,
        currentCell: { row: 1, col: 1 },
        isEditing: true,
        onNavigate,
        onStartEdit,
        onCancelEdit,
        onConfirmEdit,
      });

      nav.handleKeyDown({ key: 'Tab', shiftKey: false, preventDefault: vi.fn() });
      expect(onConfirmEdit).toHaveBeenCalled();
      expect(onNavigate).toHaveBeenCalledWith({ row: 1, col: 2 });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty table gracefully', () => {
      const emptyTable = { numRows: 0, numCols: 0, cells: [] };
      const current = { row: 0, col: 0 };
      const next = getNextCell(emptyTable, current, 'ArrowRight');
      expect(next).toEqual({ row: 0, col: 0 });
    });

    it('should handle single cell table', () => {
      const singleCellTable = {
        numRows: 1,
        numCols: 1,
        cells: [[{ row: 0, col: 0 }]],
      };
      const current = { row: 0, col: 0 };

      expect(getNextCell(singleCellTable, current, 'ArrowRight')).toEqual({ row: 0, col: 0 });
      expect(getNextCell(singleCellTable, current, 'ArrowDown')).toEqual({ row: 0, col: 0 });
      expect(getNextCell(singleCellTable, current, 'Tab')).toEqual({ row: 0, col: 0 });
    });

    it('should handle single row table', () => {
      const singleRowTable = {
        numRows: 1,
        numCols: 3,
        cells: [[{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }]],
      };
      const current = { row: 0, col: 1 };

      expect(getNextCell(singleRowTable, current, 'ArrowDown')).toEqual({ row: 0, col: 1 });
      expect(getNextCell(singleRowTable, current, 'ArrowRight')).toEqual({ row: 0, col: 2 });
    });

    it('should handle single column table', () => {
      const singleColTable = {
        numRows: 3,
        numCols: 1,
        cells: [[{ row: 0, col: 0 }], [{ row: 1, col: 0 }], [{ row: 2, col: 0 }]],
      };
      const current = { row: 1, col: 0 };

      expect(getNextCell(singleColTable, current, 'ArrowRight')).toEqual({ row: 1, col: 0 });
      expect(getNextCell(singleColTable, current, 'ArrowDown')).toEqual({ row: 2, col: 0 });
    });
  });
});
