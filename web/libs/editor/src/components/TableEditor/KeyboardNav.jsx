/**
 * KeyboardNav - Keyboard navigation utility for table cells
 *
 * Provides:
 * - Arrow key navigation (Up, Down, Left, Right)
 * - Tab/Shift+Tab navigation
 * - Enter to start editing
 * - Escape to cancel editing
 */

/**
 * Get the next cell position based on key direction
 * @param {Object} table - Table info {numRows, numCols}
 * @param {Object} current - Current cell {row, col}
 * @param {string} key - Key pressed
 * @returns {Object} New cell position {row, col}
 */
export function getNextCell(table, current, key) {
  const { numRows, numCols } = table;
  let { row, col } = current;

  // Handle empty or invalid table
  if (numRows === 0 || numCols === 0) {
    return current;
  }

  switch (key) {
    case 'ArrowRight':
      if (col < numCols - 1) {
        col += 1;
      }
      break;

    case 'ArrowLeft':
      if (col > 0) {
        col -= 1;
      }
      break;

    case 'ArrowDown':
      if (row < numRows - 1) {
        row += 1;
      }
      break;

    case 'ArrowUp':
      if (row > 0) {
        row -= 1;
      }
      break;

    case 'Tab':
      // Move to next cell, wrapping to next row
      if (col < numCols - 1) {
        col += 1;
      } else if (row < numRows - 1) {
        row += 1;
        col = 0;
      }
      // At end of table, stay in place
      break;

    default:
      break;
  }

  return { row, col };
}

/**
 * Get the previous cell position based on key direction
 * @param {Object} table - Table info {numRows, numCols}
 * @param {Object} current - Current cell {row, col}
 * @param {string} key - Key pressed
 * @returns {Object} New cell position {row, col}
 */
export function getPreviousCell(table, current, key) {
  const { numRows, numCols } = table;
  let { row, col } = current;

  // Handle empty or invalid table
  if (numRows === 0 || numCols === 0) {
    return current;
  }

  switch (key) {
    case 'ArrowLeft':
      if (col > 0) {
        col -= 1;
      }
      break;

    case 'ArrowUp':
      if (row > 0) {
        row -= 1;
      }
      break;

    case 'Shift+Tab':
      // Move to previous cell, wrapping to previous row
      if (col > 0) {
        col -= 1;
      } else if (row > 0) {
        row -= 1;
        col = numCols - 1;
      }
      // At start of table, stay in place
      break;

    default:
      break;
  }

  return { row, col };
}

/**
 * KeyboardNav class for managing keyboard navigation state
 */
export class KeyboardNav {
  constructor(options) {
    this.table = options.table;
    this.currentCell = options.currentCell;
    this.isEditing = options.isEditing || false;
    this.onNavigate = options.onNavigate;
    this.onStartEdit = options.onStartEdit;
    this.onCancelEdit = options.onCancelEdit;
    this.onConfirmEdit = options.onConfirmEdit;
  }

  /**
   * Update current cell
   */
  setCurrentCell(cell) {
    this.currentCell = cell;
  }

  /**
   * Update editing state
   */
  setEditing(isEditing) {
    this.isEditing = isEditing;
  }

  /**
   * Handle key down event
   */
  handleKeyDown(event) {
    const { key, shiftKey } = event;

    // Determine effective key (including shift modifier for Tab)
    const effectiveKey = key === 'Tab' && shiftKey ? 'Shift+Tab' : key;

    // Handle editing mode
    if (this.isEditing) {
      switch (key) {
        case 'Escape':
          event.preventDefault();
          this.onCancelEdit?.();
          break;

        case 'Enter':
          event.preventDefault();
          this.onConfirmEdit?.();
          break;

        case 'Tab':
          // Confirm edit and move to next/previous cell
          event.preventDefault();
          this.onConfirmEdit?.();
          const nextCell = shiftKey
            ? getPreviousCell(this.table, this.currentCell, 'Shift+Tab')
            : getNextCell(this.table, this.currentCell, 'Tab');
          this.onNavigate?.(nextCell);
          break;

        default:
          // Let other keys through for text input
          break;
      }
      return;
    }

    // Handle navigation mode
    switch (key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        this.onNavigate?.(getNextCell(this.table, this.currentCell, key));
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        this.onNavigate?.(getPreviousCell(this.table, this.currentCell, key));
        break;

      case 'Tab':
        event.preventDefault();
        if (shiftKey) {
          this.onNavigate?.(getPreviousCell(this.table, this.currentCell, 'Shift+Tab'));
        } else {
          this.onNavigate?.(getNextCell(this.table, this.currentCell, 'Tab'));
        }
        break;

      case 'Enter':
        event.preventDefault();
        this.onStartEdit?.();
        break;

      case 'F2':
        // Alternative key to start editing (like Excel)
        event.preventDefault();
        this.onStartEdit?.();
        break;

      default:
        // Start editing on any printable character
        if (key.length === 1 && !event.ctrlKey && !event.metaKey) {
          this.onStartEdit?.(key); // Pass the initial character
        }
        break;
    }
  }
}

/**
 * React hook for keyboard navigation
 */
export function useKeyboardNav(options) {
  const navRef = { current: new KeyboardNav(options) };

  // Update nav instance when options change
  navRef.current.table = options.table;
  navRef.current.currentCell = options.currentCell;
  navRef.current.isEditing = options.isEditing;
  navRef.current.onNavigate = options.onNavigate;
  navRef.current.onStartEdit = options.onStartEdit;
  navRef.current.onCancelEdit = options.onCancelEdit;
  navRef.current.onConfirmEdit = options.onConfirmEdit;

  return {
    handleKeyDown: (event) => navRef.current.handleKeyDown(event),
  };
}

export default KeyboardNav;
