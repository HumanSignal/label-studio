import { useState } from "react";
import { Button, ModalWindow, Message } from "@humansignal/ui";
import { ff } from "@humansignal/core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@humansignal/shad/components/ui/dialog";

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

interface ImportData {
  hotkeys?: Hotkey[];
  settings?: {
    autoTranslatePlatforms?: boolean;
  };
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: ImportData | Hotkey[]) => void | Promise<void>;
}

/**
 * ImportDialog - A dialog component for importing hotkey configurations
 *
 * This component allows users to import hotkey configurations by pasting JSON data.
 * It validates the imported data structure and provides error feedback.
 *
 * @param {ImportDialogProps} props - The component props
 * @returns {React.ReactElement} The ImportDialog component
 */
export const ImportDialog = ({ open, onOpenChange, onImport }: ImportDialogProps) => {
  // State for the import text input
  const [importText, setImportText] = useState<string>("");
  // State for validation errors
  const [error, setError] = useState<string>("");

  /**
   * Validates a single hotkey object structure
   * @param {unknown} hotkey - The hotkey object to validate
   * @throws {Error} If the hotkey is missing required fields
   */
  const validateHotkey = (hotkey: unknown): void => {
    if (!hotkey || typeof hotkey !== "object") {
      throw new Error("Invalid hotkey object");
    }

    const hotkeyObj = hotkey as Record<string, unknown>;
    const requiredFields = ["id", "section", "element", "label", "key"];
    const missingFields = requiredFields.filter((field) => !hotkeyObj[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }
  };

  /**
   * Handles the import process
   * Parses JSON, validates structure, and calls the onImport callback
   */
  const handleImport = (): void => {
    try {
      // Clear any previous errors
      setError("");

      // Validate input exists
      if (!importText.trim()) {
        throw new Error("Please enter JSON data to import");
      }

      // Parse the JSON
      const parsedData: unknown = JSON.parse(importText);

      // Handle both old format (array of hotkeys) and new format (object with hotkeys and settings)
      let hotkeys: unknown[];

      if (Array.isArray(parsedData)) {
        // Old format: direct array of hotkeys
        hotkeys = parsedData;
      } else if (parsedData && typeof parsedData === "object" && "hotkeys" in parsedData) {
        // New format: object with hotkeys property
        const dataObj = parsedData as { hotkeys?: unknown };
        if (!Array.isArray(dataObj.hotkeys)) {
          throw new Error("Invalid format: hotkeys property must be an array");
        }
        hotkeys = dataObj.hotkeys;
      } else {
        throw new Error("Invalid format: expected an array of hotkeys or an object with a hotkeys property");
      }

      // Validate it's not empty
      if (hotkeys.length === 0) {
        throw new Error("No hotkeys found in the imported data");
      }

      // Validate each hotkey object
      hotkeys.forEach((hotkey: unknown, index: number) => {
        try {
          validateHotkey(hotkey);
        } catch (validationError: unknown) {
          const errorMessage = validationError instanceof Error ? validationError.message : "Unknown validation error";
          throw new Error(`Hotkey at index ${index}: ${errorMessage}`);
        }
      });

      // If validation passes, proceed with import
      onImport(parsedData as ImportData | Hotkey[]);

      // Reset the dialog state
      resetDialogState();
    } catch (err: unknown) {
      // Set error message for display
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
    }
  };

  /**
   * Resets the dialog to its initial state
   */
  const resetDialogState = (): void => {
    setImportText("");
    setError("");
    onOpenChange(false);
  };

  /**
   * Handles dialog cancellation
   */
  const handleCancel = (): void => {
    resetDialogState();
  };

  /**
   * Handles textarea input changes
   * @param {React.ChangeEvent<HTMLTextAreaElement>} e - The change event
   */
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setImportText(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const importInstructions =
    "Paste your exported hotkeys JSON below. This will replace your current hotkeys. Make sure the JSON contains an array of hotkey objects with the required fields.";

  const importFormBody = (
    <>
      <label
        htmlFor="import-json"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Hotkeys JSON
      </label>
      <textarea
        id="import-json"
        className="flex min-h-[150px] w-full rounded-md border border-neutral-border bg-transparent px-tight py-tighter typography-body-small placeholder:text-neutral-content-subtler focus-visible:ring-4 focus-visible:ring-primary-focus-outline focus-visible:border-neutral-border-bolder focus-visible:outline-0 transition-all resize-none"
        placeholder='[{"id": 1, "section": "annotation-actions", "element": "button", "label": "Save", "key": "Ctrl+S"}]'
        value={importText}
        onChange={handleTextareaChange}
        aria-describedby={error ? "hotkeys-import-instructions import-error" : "hotkeys-import-instructions"}
      />

      {error && (
        <Message variant="negative" title="Import Error" id="import-error">
          {error}
        </Message>
      )}
    </>
  );

  if (ff.isActive(ff.FF_MODAL_WINDOW_APP_CHROME)) {
    return (
      <ModalWindow
        open={open}
        onOpenChange={onOpenChange}
        size="small"
        title="Import Hotkeys"
        dataTestId="hotkeys-import-modal"
        footer={
          <div className="flex w-full justify-end gap-tight">
            <Button variant="neutral" onClick={handleCancel} data-testid="hotkeys-import-cancel">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!importText.trim()}
              data-testid="hotkeys-import-submit"
            >
              Import Hotkeys
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <p className="typography-body-small text-neutral-content-subtle m-0" id="hotkeys-import-instructions">
            {importInstructions}
          </p>
          {importFormBody}
        </div>
      </ModalWindow>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] bg-neutral-surface">
        <DialogHeader>
          <DialogTitle>Import Hotkeys</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <DialogDescription className="m-0" id="hotkeys-import-instructions">
            {importInstructions}
          </DialogDescription>
          {importFormBody}
        </div>

        <DialogFooter>
          <Button variant="neutral" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!importText.trim()}>
            Import Hotkeys
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
