import { useCallback, useEffect, useState } from "react";
import { Badge, Button, cnm, Message, ToastType, Typography, useToast } from "@humansignal/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@humansignal/ui/lib/card-new/card";
import { confirm } from "@humansignal/ui/lib/modal";
import { IconWarning } from "@humansignal/icons";
import { useLocation } from "react-router-dom";
import { LeaveBlocker, type LeaveBlockerCallbacks } from "apps/labelstudio/src/components/LeaveBlocker/LeaveBlocker";
import {
  Card as ShadCard,
  CardContent as ShadCardContent,
  CardHeader as ShadCardHeader,
} from "@humansignal/shad/components/ui/card";
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
import { getSaveSuccessMessage, type HotkeyScope, useHotkeys } from "../hooks/useHotkeys";
import {
  parseProjectHotkeyScopeFromSearch,
  ProjectHotkeyScopeSelector,
  type ProjectHotkeyScopeResolution,
} from "../components/ProjectHotkeyScopeSelector";

const typedHotkeySections = HOTKEY_SECTIONS as Section[];

export const HotkeysManager = () => {
  const location = useLocation();
  const [isDirty, setIsDirty] = useState(false);
  const [resolution, setResolution] = useState<ProjectHotkeyScopeResolution>(() =>
    parseProjectHotkeyScopeFromSearch(location.search),
  );

  const handleResolutionChange = useCallback((nextResolution: ProjectHotkeyScopeResolution) => {
    setResolution(nextResolution);
  }, []);

  const handleDirtyNavigation = useCallback(({ continueCallback, cancelCallback }: LeaveBlockerCallbacks) => {
    confirm({
      title: "Discard unsaved hotkey changes?",
      body: "Changing hotkey scope will discard your unsaved changes.",
      okText: "Discard Changes",
      buttonLook: "negative",
      onOk: () => {
        setIsDirty(false);
        continueCallback?.();
      },
      onCancel: cancelCallback,
    });
  }, []);

  const scope: HotkeyScope | null =
    resolution.status === "account"
      ? { kind: "account" }
      : resolution.status === "project"
        ? { kind: "project", projectId: resolution.projectId }
        : null;

  return (
    <Card className="!w-full">
      <CardHeader>
        <div className="flex flex-col gap-tight">
          <CardTitle>
            <div className="flex items-center gap-tight">
              <span>Hotkeys</span>
              <Badge variant="beta" look="solid" shape="rounded">
                Beta
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Customize your keyboard shortcuts to speed up your workflow. Click on any hotkey below to assign a new key
            combination that works best for you.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div id="hotkeys-manager" className="flex flex-col gap-wide">
          <LeaveBlocker key={location.search} active={isDirty} onBlock={handleDirtyNavigation} />
          <ProjectHotkeyScopeSelector onResolutionChange={handleResolutionChange} />
          {resolution.status === "project" && (
            <div className="flex flex-col gap-tighter">
              <Typography variant="headline" size="small">
                Project override for {resolution.projectTitle}
              </Typography>
              <Typography variant="body" className="text-neutral-content-subtle">
                Only shortcuts that differ from your account defaults apply while you work in this project.
              </Typography>
            </div>
          )}
          {scope && (
            <ScopedHotkeysContent
              key={scope.kind === "project" ? `project:${scope.projectId}` : "account"}
              scope={scope}
              onDirtyChange={setIsDirty}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface PropsScopedHotkeysContent {
  scope: HotkeyScope;
  onDirtyChange: (isDirty: boolean) => void;
}

const ScopedHotkeysContent = ({ scope, onDirtyChange }: PropsScopedHotkeysContent) => {
  const toast = useToast();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingHotkeyId, setEditingHotkeyId] = useState<string | null>(null);
  const [dirtyState, setDirtyState] = useState<DirtyState>({});
  const [duplicateConfirmDialog, setDuplicateConfirmDialog] = useState<DuplicateConfirmDialog>({
    open: false,
    hotkeyId: null,
    newKey: null,
    conflictingHotkeys: [],
  });

  const {
    hotkeys,
    setHotkeys,
    isLoading,
    setIsLoading,
    saveHotkeysToAPI,
    handleResetToDefaults,
    handleExportHotkeys,
    handleImportHotkeys,
    hasProjectAccessError,
    isReadOnly,
  } = useHotkeys(scope);

  useEffect(() => {
    onDirtyChange(Object.values(dirtyState).some(Boolean));
  }, [dirtyState, onDirtyChange]);

  const handleScopedReset = useCallback(() => {
    if (isReadOnly) return;
    handleResetToDefaults(() => setDirtyState({}));
  }, [handleResetToDefaults, isReadOnly]);

  const handleScopedImport = useCallback(
    async (data: ImportData | Hotkey[]): Promise<boolean> => {
      if (isReadOnly) return false;
      return await handleImportHotkeys(data, () => setDirtyState({}));
    },
    [handleImportHotkeys, isReadOnly],
  );

  const getGlobalDuplicates = (hotkeyId: string, newKey: string): Hotkey[] => {
    return hotkeys.filter((h: Hotkey) => h.id !== hotkeyId && h.key === newKey);
  };

  const handleToggleHotkey = (hotkeyId: string) => {
    if (isReadOnly) return;

    const updatedHotkeys = hotkeys.map((hotkey: Hotkey) => {
      if (hotkey.id === hotkeyId) {
        return { ...hotkey, active: !hotkey.active };
      }
      return hotkey;
    });

    setHotkeys(updatedHotkeys);

    const hotkey = hotkeys.find((h: Hotkey) => h.id === hotkeyId);
    if (hotkey) {
      setDirtyState({
        ...dirtyState,
        [hotkey.section]: true,
      });
    }
  };

  const getSectionTitle = (sectionId: string): string => {
    const section = typedHotkeySections.find((s: Section) => s.id === sectionId);
    return section ? section.title : sectionId;
  };

  const updateHotkeyKey = (hotkeyId: string, newKey: string) => {
    if (isReadOnly) return;

    const hotkey = hotkeys.find((h: Hotkey) => h.id === hotkeyId);
    if (!hotkey) return;

    const updatedHotkeys = hotkeys.map((h: Hotkey) => {
      if (h.id === hotkeyId) {
        return { ...h, key: newKey, mac: newKey };
      }
      return h;
    });

    setHotkeys(updatedHotkeys);
    setDirtyState({
      ...dirtyState,
      [hotkey.section]: true,
    });
    setEditingHotkeyId(null);
  };

  const handleSaveHotkey = (hotkeyId: string, newKey: string) => {
    if (isReadOnly) return;

    const hotkey = hotkeys.find((h: Hotkey) => h.id === hotkeyId);
    if (!hotkey) return;

    const conflictingHotkeys = getGlobalDuplicates(hotkeyId, newKey);
    if (conflictingHotkeys.length > 0) {
      setDuplicateConfirmDialog({
        open: true,
        hotkeyId,
        newKey,
        conflictingHotkeys,
      });
      return;
    }

    updateHotkeyKey(hotkeyId, newKey);
  };

  const handleConfirmDuplicate = () => {
    const { hotkeyId, newKey } = duplicateConfirmDialog;
    setDuplicateConfirmDialog({
      open: false,
      hotkeyId: null,
      newKey: null,
      conflictingHotkeys: [],
    });
    if (hotkeyId && newKey) {
      updateHotkeyKey(hotkeyId, newKey);
    }
  };

  const handleCancelDuplicate = () => {
    setDuplicateConfirmDialog({
      open: false,
      hotkeyId: null,
      newKey: null,
      conflictingHotkeys: [],
    });
  };

  const handleSaveSection = async (sectionId: string) => {
    if (isReadOnly) return;

    setIsLoading(true);

    try {
      const result = await saveHotkeysToAPI(hotkeys, {});

      if (result.ok) {
        const newDirtyState = { ...dirtyState };
        delete newDirtyState[sectionId];
        setDirtyState(newDirtyState);

        const sectionName =
          sectionId === "settings" ? "Settings" : typedHotkeySections.find((s: Section) => s.id === sectionId)?.title;

        if (toast) {
          toast.show({
            message: getSaveSuccessMessage(
              sectionName ?? "Hotkeys",
              scope.kind === "project" ? scope.projectId : undefined,
            ),
            type: ToastType.info,
          });
        }
      } else if (toast) {
        toast.show({
          message: `Failed to save: ${result.error || "Unknown error"}`,
          type: ToastType.error,
        });
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

  const getHotkeysBySection = (sectionId: string): Hotkey[] => {
    return hotkeys.filter((hotkey: Hotkey) => hotkey.section === sectionId);
  };

  return (
    <div className="flex flex-col gap-wide">
      <div className={cnm(styles.flexRow, "justify-end !gap-tight")}>
        <Button
          variant="neutral"
          look="outlined"
          onClick={() => setImportDialogOpen(true)}
          disabled={isLoading || isReadOnly}
        >
          Import
        </Button>
        <Button variant="neutral" look="outlined" onClick={handleExportHotkeys} disabled={isLoading || isReadOnly}>
          Export
        </Button>
        <Button variant="negative" look="outlined" onClick={handleScopedReset} disabled={isLoading || isReadOnly}>
          Reset to Defaults
        </Button>
      </div>

      <ImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} onImport={handleScopedImport} />

      {hasProjectAccessError && (
        <Message variant="negative" title="Project unavailable">
          You no longer have access to this project
        </Message>
      )}
      <fieldset
        disabled={isReadOnly}
        aria-readonly={isReadOnly}
        className={cnm("m-0 min-w-0 border-0 p-0", isReadOnly && "pointer-events-none opacity-60")}
      >
        <div className={styles.sectionContent}>
          {isLoading && hotkeys.length === 0 ? (
            <div className="flex flex-col gap-wide">
              <ShadCard>
                <ShadCardHeader className="pb-tight">
                  <Skeleton className="h-wide w-[16rem]" />
                  <Skeleton className="h-base w-[18rem]" />
                </ShadCardHeader>
                <ShadCardContent>
                  <Skeleton className="h-5 w-44 mb-tight" />
                  <Skeleton className="h-base w-[16rem]" />
                </ShadCardContent>
              </ShadCard>
              {typedHotkeySections.map((section: Section) => (
                <ShadCard key={section.id}>
                  <ShadCardHeader className="pb-tight">
                    <Skeleton className="h-wide w-[16rem]" />
                    <Skeleton className="h-base w-[18rem]" />
                  </ShadCardHeader>
                  <ShadCardContent>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`py-wide ${i < 3 ? "border-b border-border" : ""}`}>
                        <Skeleton className="h-5 w-44 mb-tight" />
                        <Skeleton className="h-base w-[16rem]" />
                      </div>
                    ))}
                  </ShadCardContent>
                </ShadCard>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-wide">
              {typedHotkeySections.map((section: Section) => (
                <HotkeySection
                  key={section.id}
                  section={section}
                  hotkeys={getHotkeysBySection(section.id)}
                  editingHotkeyId={editingHotkeyId}
                  onSaveHotkey={handleSaveHotkey}
                  onCancelEdit={() => setEditingHotkeyId(null)}
                  onToggleHotkey={handleToggleHotkey}
                  onSaveSection={handleSaveSection}
                  hasChanges={dirtyState[section.id] || false}
                  onEditHotkey={isReadOnly ? () => undefined : setEditingHotkeyId}
                />
              ))}
            </div>
          )}
        </div>
      </fieldset>

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
