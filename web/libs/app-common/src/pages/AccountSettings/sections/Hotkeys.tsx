import { useState } from "react";
import { IconWarning, ToastType, useToast } from "@humansignal/ui";

// Shadcn UI components
import { Button } from "@humansignal/ui";
import { Card, CardContent, CardHeader } from "@humansignal/shad/components/ui/card";
import { Skeleton } from "@humansignal/shad/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@humansignal/shad/components/ui/dialog";

import { HotkeySection } from "./Hotkeys/Section";
import { ImportDialog } from "./Hotkeys/Import";
import { KeyboardKey } from "./Hotkeys/Key";
import type { Hotkey, Section, DirtyState, DuplicateConfirmDialog, ImportData } from "./Hotkeys/utils";
// @ts-ignore
import { HOTKEY_SECTIONS } from "./Hotkeys/defaults";
import styles from "../AccountSettings.module.css";
import { useHotkeys } from "../hooks/useHotkeys";

// Type the imported defaults
const typedHotkeySections = HOTKEY_SECTIONS as Section[];

export const HotkeysHeaderButtons = () => {
  const [importDialogOpen, setImportDialogOpen] = useState<boolean>(false);
  const { handleResetToDefaults, handleExportHotkeys, handleImportHotkeys } = useHotkeys();

  return (
    <>
      <div className={`${styles.flexRow} justify-end gap-tight`}>
        <Button variant="neutral" look="outlined" onClick={() => setImportDialogOpen(true)}>
          Import
        </Button>
        <Button variant="neutral" look="outlined" onClick={handleExportHotkeys}>
          Export
        </Button>
        <Button variant="negative" look="outlined" onClick={handleResetToDefaults}>
          Reset to Defaults
        </Button>
      </div>

      {/* Import Dialog */}
      <ImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} onImport={handleImportHotkeys} />
    </>
  );
};

export const HotkeysManager = () => {
  const toast = useToast();
  const [editingHotkeyId, setEditingHotkeyId] = useState<string | null>(null);
  const [dirtyState, setDirtyState] = useState<DirtyState>({});
  const [duplicateConfirmDialog, setDuplicateConfirmDialog] = useState<DuplicateConfirmDialog>({
    open: false,
    hotkeyId: null,
    newKey: null,
    conflictingHotkeys: [],
  });

  // Use the shared hook for common functionality
  const { hotkeys, setHotkeys, isLoading, setIsLoading, saveHotkeysToAPI } = useHotkeys();

  // Check if a hotkey conflicts with others globally
  const getGlobalDuplicates = (hotkeyId: string, newKey: string): Hotkey[] => {
    return hotkeys.filter((h: Hotkey) => h.id !== hotkeyId && h.key === newKey);
  };

  // Handle toggling a single hotkey
  const handleToggleHotkey = (hotkeyId: string) => {
    // Update the hotkey
    const updatedHotkeys = hotkeys.map((hotkey: Hotkey) => {
      if (hotkey.id === hotkeyId) {
        return { ...hotkey, active: !hotkey.active };
      }
      return hotkey;
    });

    setHotkeys(updatedHotkeys);

    // Mark the section as having changes
    const hotkey = hotkeys.find((h: Hotkey) => h.id === hotkeyId);
    if (hotkey) {
      setDirtyState({
        ...dirtyState,
        [hotkey.section]: true,
      });
    }
  };

  // Helper function to get section title by ID
  const getSectionTitle = (sectionId: string): string => {
    const section = typedHotkeySections.find((s: Section) => s.id === sectionId);
    return section ? section.title : sectionId;
  };

  // Handle saving an edited hotkey
  const handleSaveHotkey = (hotkeyId: string, newKey: string) => {
    // Find the hotkey to update
    const hotkey = hotkeys.find((h: Hotkey) => h.id === hotkeyId);
    if (!hotkey) return;

    // Check for global duplicates
    const conflictingHotkeys = getGlobalDuplicates(hotkeyId, newKey);

    if (conflictingHotkeys.length > 0) {
      // Show confirmation dialog for duplicates
      setDuplicateConfirmDialog({
        open: true,
        hotkeyId,
        newKey,
        conflictingHotkeys,
      });
      return;
    }

    // No conflicts, proceed with the update
    updateHotkeyKey(hotkeyId, newKey);
  };

  // Function to actually update the hotkey key
  const updateHotkeyKey = (hotkeyId: string, newKey: string) => {
    // Find the hotkey to update
    const hotkey = hotkeys.find((h: Hotkey) => h.id === hotkeyId);
    if (!hotkey) return;

    // Update the hotkey
    const updatedHotkeys = hotkeys.map((h: Hotkey) => {
      if (h.id === hotkeyId) {
        return { ...h, key: newKey, mac: newKey };
      }
      return h;
    });

    setHotkeys(updatedHotkeys);

    // Mark the section as having changes
    setDirtyState({
      ...dirtyState,
      [hotkey.section]: true,
    });

    // Exit edit mode
    setEditingHotkeyId(null);
  };

  // Handle confirming duplicate hotkey
  const handleConfirmDuplicate = () => {
    const { hotkeyId, newKey } = duplicateConfirmDialog;

    // Close the dialog
    setDuplicateConfirmDialog({
      open: false,
      hotkeyId: null,
      newKey: null,
      conflictingHotkeys: [],
    });

    // Proceed with the update
    if (hotkeyId && newKey) {
      updateHotkeyKey(hotkeyId, newKey);
    }
  };

  // Handle canceling duplicate confirmation
  const handleCancelDuplicate = () => {
    setDuplicateConfirmDialog({
      open: false,
      hotkeyId: null,
      newKey: null,
      conflictingHotkeys: [],
    });
  };

  // Handle canceling edit mode
  const handleCancelEdit = () => {
    setEditingHotkeyId(null);
  };

  // Handle saving a section's hotkeys
  const handleSaveSection = async (sectionId: string) => {
    setIsLoading(true);

    try {
      // Save ALL modified hotkeys and settings, not just this section
      const result = await saveHotkeysToAPI(hotkeys, {});

      if (result.ok) {
        // Clear the dirty state for this section
        const newDirtyState = { ...dirtyState };
        delete newDirtyState[sectionId];
        setDirtyState(newDirtyState);

        const sectionName =
          sectionId === "settings" ? "Settings" : typedHotkeySections.find((s: Section) => s.id === sectionId)?.title;

        if (toast) {
          toast.show({
            message: `${sectionName} hotkeys saved successfully`,
            type: ToastType.info,
          });
        }
      } else {
        if (toast) {
          toast.show({
            message: `Failed to save: ${result.error || "Unknown error"}`,
            type: ToastType.error,
          });
        }
      }
    } catch (error: unknown) {
      if (toast) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        toast.show({
          message: `Error saving: ${errorMessage}`,
          type: ToastType.error,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced import handler that manages dirty state
  const handleImportHotkeys = async (importedData: ImportData | Hotkey[]) => {
    try {
      setIsLoading(true);

      // Handle both old format (just hotkeys array) and new format (with settings)
      const importedHotkeys = Array.isArray(importedData) ? importedData : importedData.hotkeys || [];
      const importedSettings = Array.isArray(importedData) ? {} : importedData.settings || {};

      // Update local state
      setHotkeys(importedHotkeys);

      // Save all imported data to API (including settings)
      const result = await saveHotkeysToAPI(importedHotkeys, importedSettings);

      if (!result.ok) {
        throw new Error(result.error || "Failed to save imported hotkeys");
      }

      // Reset dirty state
      setDirtyState({});

      if (toast) {
        toast.show({ message: "Hotkeys imported successfully", type: ToastType.info });
      }
    } catch (error: unknown) {
      if (toast) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        toast.show({ message: `Error importing hotkeys: ${errorMessage}`, type: ToastType.error });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Group hotkeys by section
  const getHotkeysBySection = (sectionId: string): Hotkey[] => {
    return hotkeys.filter((hotkey: Hotkey) => hotkey.section === sectionId);
  };

  return (
    <div id="hotkeys-manager">
      <div className={styles.sectionContent}>
        {isLoading && hotkeys.length === 0 ? (
          <div className="flex flex-col gap-wide">
            {/* Platform settings skeleton */}
            <Card>
              <CardHeader className="pb-tight">
                <Skeleton className="h-wide w-[16rem]" />
                <Skeleton className="h-base w-[18rem]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-5 w-44 mb-tight" />
                <Skeleton className="h-base w-[16rem]" />
              </CardContent>
            </Card>

            {/* Hotkey sections skeleton */}
            {typedHotkeySections.map((section: Section) => (
              <Card key={section.id}>
                <CardHeader className="pb-tight">
                  <Skeleton className="h-wide w-[16rem]" />
                  <Skeleton className="h-base w-[18rem]" />
                </CardHeader>
                <CardContent>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`py-wide ${i < 3 ? "border-b border-border" : ""}`}>
                      <Skeleton className="h-5 w-44 mb-tight" />
                      <Skeleton className="h-base w-[16rem]" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-wide">
            {/* Hotkey Sections */}
            {typedHotkeySections.map((section: Section) => (
              <HotkeySection
                key={section.id}
                section={section}
                hotkeys={getHotkeysBySection(section.id)}
                editingHotkeyId={editingHotkeyId}
                onSaveHotkey={handleSaveHotkey}
                onCancelEdit={handleCancelEdit}
                onToggleHotkey={handleToggleHotkey}
                onSaveSection={handleSaveSection}
                hasChanges={dirtyState[section.id] || false}
                onEditHotkey={setEditingHotkeyId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Duplicate Confirmation Dialog */}
      <Dialog open={duplicateConfirmDialog.open} onOpenChange={handleCancelDuplicate}>
        <DialogContent className="bg-neutral-surface">
          <DialogHeader>
            <DialogTitle>Warning: Duplicate Hotkey Detected</DialogTitle>
            <DialogDescription>
              The hotkey combination "<strong>{duplicateConfirmDialog.newKey}</strong>" is already being used by:
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-60 overflow-y-auto">
            <div className="flex flex-col gap-base">
              {duplicateConfirmDialog.conflictingHotkeys.map((conflictHotkey: Hotkey) => (
                <div
                  key={conflictHotkey.id}
                  className="flex items-center justify-between p-base bg-neutral-surface rounded-small border border-warning-border-subtle"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                      {conflictHotkey.label}
                    </div>
                    <div className="text-small text-neutral-content-subtler">
                      {getSectionTitle(conflictHotkey.section)}
                    </div>
                  </div>
                  <div className="ml-tight flex-shrink-0">
                    <KeyboardKey>{conflictHotkey.key}</KeyboardKey>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogDescription className="text-warning-text bg-warning-background p-base rounded-small border border-warning-border-subtle flex items-start gap-tight">
            <div>
              <IconWarning className="text-warning-icon" />
            </div>
            <div>
              Having duplicate hotkeys may cause conflicts and unexpected behavior. Are you sure you want to proceed?
            </div>
          </DialogDescription>

          <DialogFooter>
            <Button variant="neutral" onClick={handleCancelDuplicate}>
              Cancel
            </Button>
            <Button onClick={handleConfirmDuplicate}>Allow Duplicate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
