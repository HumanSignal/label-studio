/**
 * CellEditor - Inline text editor for table cells
 *
 * Provides:
 * - Inline text input for cell editing
 * - Auto-focus on mount
 * - Enter to confirm, Escape to cancel
 * - Initial value from OCR text
 */

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';

import styles from './CellEditor.module.scss';

/**
 * CellEditor component
 */
const CellEditor = memo(({
  value,
  onConfirm,
  onCancel,
  initialCharacter,
  style,
}) => {
  const inputRef = useRef(null);
  const [text, setText] = useState(initialCharacter || value || '');

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();

      // If starting with initial character, cursor at end
      // Otherwise, select all text
      if (initialCharacter) {
        inputRef.current.selectionStart = inputRef.current.value.length;
        inputRef.current.selectionEnd = inputRef.current.value.length;
      } else {
        inputRef.current.select();
      }
    }
  }, [initialCharacter]);

  // Handle input change
  const handleChange = useCallback((e) => {
    setText(e.target.value);
  }, []);

  // Handle key down
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        onConfirm?.(text);
        break;

      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        onCancel?.();
        break;

      case 'Tab':
        // Let Tab propagate for navigation
        // The parent will handle confirming the edit
        break;

      default:
        // Prevent navigation keys from bubbling
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.stopPropagation();
        }
        break;
    }
  }, [text, onConfirm, onCancel]);

  // Handle blur - confirm on focus loss
  const handleBlur = useCallback(() => {
    onConfirm?.(text);
  }, [text, onConfirm]);

  return (
    <input
      ref={inputRef}
      type="text"
      className={styles.cellEditorInput}
      value={text}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={style}
      data-testid="cell-editor-input"
    />
  );
});

CellEditor.displayName = 'CellEditor';

export { CellEditor };
export default CellEditor;
