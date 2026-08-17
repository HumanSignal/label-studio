import { useState } from "react";
import { Button, ModalWindow, Message, Typography } from "@humansignal/ui";
import { ff } from "@humansignal/core";
import { useTranslation } from "react-i18next";
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
  onImport: (data: ImportData | Hotkey[]) => boolean | Promise<boolean>;
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
  const { t } = useTranslation();
  // State for the import text input
  const [importText, setImportText] = useState<string>("");
  // State for validation errors
  const [error, setError] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);

  /**
   * Validates a single hotkey object structure
   * @param {unknown} hotkey - The hotkey object to validate
   * @throws {Error} If the hotkey is missing required fields
   */
  const validateHotkey = (hotkey: unknown): void => {
    if (!hotkey || typeof hotkey !== "object") {
      throw new Error(t("account:accountInvalidHotkeyObject"));
    }

    const hotkeyObj = hotkey as Record<string, unknown>;
    const requiredFields = ["id", "section", "element", "label", "key"];
    const missingFields = requiredFields.filter((field) => !hotkeyObj[field]);

    if (missingFields.length > 0) {
      throw new Error(t("account:accountMissingRequiredFields", { fields: missingFields.join(", ") }));
    }
  };

  /**
   * Handles the import process
   * Parses JSON, validates structure, and calls the onImport callback
   */
  const handleImport = async (): Promise<void> => {
    try {
      // Clear any previous errors
      setError("");

      // Validate input exists
      if (!importText.trim()) {
        throw new Error(t("account:accountEnterJsonError"));
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
          throw new Error(t("account:accountInvalidHotkeysArrayError"));
        }
        hotkeys = dataObj.hotkeys;
      } else {
        throw new Error(t("account:accountInvalidHotkeysFormatError"));
      }

      // Validate it's not empty
      if (hotkeys.length === 0) {
        throw new Error(t("account:accountNoHotkeysFound"));
      }

      // Validate each hotkey object
      hotkeys.forEach((hotkey: unknown, index: number) => {
        try {
          validateHotkey(hotkey);
        } catch (validationError: unknown) {
          const errorMessage =
            validationError instanceof Error ? validationError.message : t("account:accountUnknownValidationError");
          throw new Error(t("account:accountHotkeyAtIndex", { index, message: errorMessage }));
        }
      });

      // If validation passes, proceed with import
      setIsImporting(true);
      const imported = await onImport(parsedData as ImportData | Hotkey[]);
      if (imported) resetDialogState();
    } catch (err: unknown) {
      // Set error message for display
      const errorMessage = err instanceof Error ? err.message : t("account:accountUnknownErrorOccurred");
      setError(errorMessage);
    } finally {
      setIsImporting(false);
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

  const importInstructions = t("account:accountImportInstructions");

  const importFormBody = (
    <>
      <label
        htmlFor="import-json"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {t("account:accountHotkeysJsonLabel")}
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
        <Message variant="negative" title={t("account:accountImportErrorTitle")} id="import-error">
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
        title={t("account:accountImportHotkeys")}
        dataTestId="hotkeys-import-modal"
        footer={
          <div className="flex w-full justify-end gap-tight">
            <Button variant="neutral" onClick={handleCancel} data-testid="hotkeys-import-cancel">
              {t("account:commonCancel")}
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!importText.trim() || isImporting}
              data-testid="hotkeys-import-submit"
            >
              {t("account:accountImportHotkeys")}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Typography
            variant="body"
            size="small"
            className="text-neutral-content-subtle m-0"
            id="hotkeys-import-instructions"
          >
            {importInstructions}
          </Typography>
          {importFormBody}
        </div>
      </ModalWindow>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] bg-neutral-surface" aria-describedby="hotkeys-import-instructions">
        <DialogHeader>
          <DialogTitle>{t("account:accountImportHotkeys")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div id="hotkeys-import-instructions">
            <DialogDescription className="m-0">{importInstructions}</DialogDescription>
          </div>
          {importFormBody}
        </div>

        <DialogFooter>
          <Button variant="neutral" onClick={handleCancel}>
            {t("account:commonCancel")}
          </Button>
          <Button onClick={handleImport} disabled={!importText.trim() || isImporting}>
            {t("account:accountImportHotkeys")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
