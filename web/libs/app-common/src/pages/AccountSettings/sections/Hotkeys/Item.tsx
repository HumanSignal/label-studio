import { useEffect, useState, useRef } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

// UI components
import { Button, Tooltip } from "@humansignal/ui";
import { Toggle as UiToggle } from "@humansignal/ui";
import { KeyboardKey } from "./Key";
import { IconClose } from "@humansignal/icons";

// Type definitions
interface Hotkey {
  id: string;
  section: string;
  element: string;
  label: string;
  key: string;
  mac?: string;
  active: boolean;
  subgroup?: string;
  description?: string;
}

interface HotkeyItemProps {
  hotkey: Hotkey;
  onEdit: (id: string) => void;
  isEditing: boolean;
  onSave: (id: string, newKey: string) => void;
  onCancel: (id: string) => void;
  onToggle: (id: string) => void;
}

/**
 * HotkeyItem component for displaying and editing keyboard shortcuts
 *
 * @param {HotkeyItemProps} props - The component props
 * @returns {React.ReactElement} The HotkeyItem component
 */
export const HotkeyItem = ({ hotkey, onEdit, isEditing, onSave, onCancel, onToggle }: HotkeyItemProps) => {
  const { t } = useTranslation();
  const [editedKey, setEditedKey] = useState<string>(hotkey.key);
  const [keyRecordingMode, setKeyRecordingMode] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const keyRecordingRef = useRef<HTMLButtonElement>(null);

  /**
   * Auto-start key recording when entering edit mode
   * Focuses the input and begins listening for key presses immediately
   */
  useEffect(() => {
    if (isEditing) {
      setKeyRecordingMode(true);
      setEditedKey("");
      setError("");
      // Small delay ensures DOM element is ready for focus
      setTimeout(() => {
        if (keyRecordingRef.current) {
          keyRecordingRef.current.focus();
        }
      }, 50);
    }
  }, [isEditing]);

  /**
   * Handles key press events and builds key combination strings
   * Captures modifier keys (ctrl, shift, alt, meta) and main key
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (!keyRecordingMode) return;

    e.preventDefault();

    const { key, ctrlKey, shiftKey, altKey, metaKey } = e.nativeEvent;

    // Skip if only modifier keys are pressed
    if (["Control", "Shift", "Alt", "Meta"].includes(key)) return;

    // Build key combination array
    const keyCombo: string[] = [];
    if (ctrlKey) keyCombo.push("ctrl");
    if (shiftKey) keyCombo.push("shift");
    if (altKey) keyCombo.push("alt");
    if (metaKey) keyCombo.push("meta");

    keyCombo.push(key.toLowerCase());

    setEditedKey(keyCombo.join("+"));
    setError("");
    setKeyRecordingMode(false);
  };

  /**
   * Manually restart key recording (for when user wants to re-record)
   */
  const startRecordingKeys = (): void => {
    setKeyRecordingMode(true);
    setEditedKey("");
    setError("");
    if (keyRecordingRef.current) {
      keyRecordingRef.current.focus();
    }
  };

  /**
   * Save the edited key combination
   */
  const handleSave = (): void => {
    onSave(hotkey.id, editedKey);
  };

  /**
   * Handle cancel button click
   */
  const handleCancel = (): void => {
    onCancel(hotkey.id);
  };

  /**
   * Handle toggle change
   */
  const handleToggle = (): void => {
    onToggle(hotkey.id);
  };

  /**
   * Handle edit button click
   */
  const handleEdit = (): void => {
    onEdit(hotkey.id);
  };

  // Render edit mode interface
  if (isEditing) {
    return (
      <div className="py-3 space-y-3 border-b border-border last:border-0">
        <div className="font-medium">{hotkey.label}</div>
        <div className="flex gap-3">
          {/* Key recording input area */}
          <Button
            ref={keyRecordingRef}
            variant="neutral"
            className={clsx(
              "flex-1 flex items-center justify-center min-h-[40px] px-base py-tight border rounded-md cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary-border-subtle focus:border-primary-border-bold focus:ring-offset-2",
              keyRecordingMode ? "border-neutral-border-bolder" : "border-input bg-neutral-surface",
              error ? "border-destructive" : "",
            )}
            onClick={startRecordingKeys}
            onKeyDown={handleKeyPress}
            aria-label={t("account:accountRecordShortcutAria")}
          >
            {keyRecordingMode ? (
              <span className="text-primary-content font-medium animate-pulse">{t("account:accountPressKeysNow")}</span>
            ) : editedKey ? (
              <KeyboardKey>{editedKey}</KeyboardKey>
            ) : (
              <span className="text-neutral-content-subtler">{t("account:accountClickToSetShortcut")}</span>
            )}
          </Button>

          {/* Action buttons */}
          <div className="flex flex-row gap-2">
            <Button variant="primary" onClick={handleSave} disabled={!editedKey || !!error}>
              {t("account:accountApplyButton")}
            </Button>
            <Button variant="neutral" icon={<IconClose />} onClick={handleCancel} />
          </div>
        </div>
        {error && <div className="text-sm text-destructive mt-1">{error}</div>}
      </div>
    );
  }

  // Render normal view: toggle switch, label/description, hotkey display
  return (
    <div
      className={clsx("flex items-center py-3 border-b border-border/10 last:border-0", !hotkey.active && "opacity-60")}
    >
      {/* Toggle switch */}
      <div className="flex-none mr-4">
        <UiToggle
          checked={hotkey.active}
          onChange={handleToggle}
          aria-label={t(hotkey.active ? "account:accountDisableHotkeyAria" : "account:accountEnableHotkeyAria", {
            label: hotkey.label,
          })}
        />
      </div>

      {/* Label and description */}
      <div className="flex-1 mr-4">
        <div className="font-medium">{hotkey.label}</div>
        <div className="text-sm text-neutral-content-subtler">{hotkey.description}</div>
      </div>

      {/* Current hotkey display (clickable to edit) */}
      <Tooltip title={t("account:accountClickToEditHotkey")}>
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 hover:bg-primary-emphasis-subtle px-base py-base rounded-small"
          onClick={handleEdit}
        >
          <KeyboardKey>{hotkey.key}</KeyboardKey>
        </div>
      </Tooltip>
    </div>
  );
};
