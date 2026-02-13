import type { ReactNode } from "react";
import styles from "./Key.module.scss";

// Type definitions
interface KeyboardKeyProps {
  children: ReactNode;
}

// Individual key styling component
const IndividualKey = ({ children }: { children: ReactNode }) => {
  return <kbd className={styles.individualKey}>{children}</kbd>;
};

/**
 * KeyboardKey component for displaying keyboard shortcuts as individual styled keys
 * Splits compound shortcuts (like "Ctrl+A") into separate visual key components
 *
 * @param {KeyboardKeyProps} props - The component props
 * @returns {React.ReactElement} The KeyboardKey component with individual styled keys
 */
export const KeyboardKey = ({ children }: KeyboardKeyProps) => {
  // Convert children to string for parsing
  const keyString = String(children);

  // Split the key combination by common separators
  const keys = keyString
    .split(/[+\s]+/) // Split by + or spaces
    .filter((key) => key.trim().length > 0) // Remove empty strings
    .map((key) => key.trim()); // Trim whitespace

  // Render all keys consistently
  return (
    <div className={styles.keyGroup}>
      {keys.map((key, index) => (
        <IndividualKey key={index}>{key}</IndividualKey>
      ))}
    </div>
  );
};
