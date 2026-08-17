import clsx from "clsx";
import { Button } from "@humansignal/ui";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@humansignal/shad/components/ui/card";
import { HotkeyItem } from "./Item";
import { hotkeySectionDescription, hotkeySectionTitle } from "./utils";

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

interface Section {
  id: string;
  title: string;
  description?: string;
}

interface GroupedHotkeys {
  [subgroup: string]: Hotkey[];
}

interface HotkeySectionProps {
  section: Section;
  hotkeys: Hotkey[];
  editingHotkeyId: string | null;
  onEditHotkey: (id: string) => void;
  onSaveHotkey: (id: string, newKey: string) => void;
  onCancelEdit: () => void;
  onSaveSection: (sectionId: string) => void;
  onToggleHotkey: (id: string) => void;
  hasChanges: boolean;
}

/**
 * HotkeySection Component
 *
 * Displays a section of hotkeys grouped by subgroups within a card layout.
 * Provides functionality to edit, toggle, and save hotkeys within the section.
 *
 * @param {HotkeySectionProps} props - Component props
 * @returns {JSX.Element} Rendered HotkeySection component
 *
 * @example
 * <HotkeySection
 *   section={{ id: "editor", title: "Editor", description: "Text editing shortcuts" }}
 *   hotkeys={[
 *     { id: "1", subgroup: "navigation", ... },
 *     { id: "2", subgroup: "editing", ... }
 *   ]}
 *   editingHotkeyId={null}
 *   onEditHotkey={(id) => setEditingId(id)}
 *   onSaveHotkey={(id, newKey) => saveHotkey(id, newKey)}
 *   onCancelEdit={() => setEditingId(null)}
 *   onSaveSection={(sectionId) => saveSection(sectionId)}
 *   onToggleHotkey={(id) => toggleHotkey(id)}
 *   hasChanges={true}
 * />
 */
export const HotkeySection = ({
  section,
  hotkeys,
  editingHotkeyId,
  onEditHotkey,
  onSaveHotkey,
  onCancelEdit,
  onSaveSection,
  onToggleHotkey,
  hasChanges,
}: HotkeySectionProps) => {
  const { t } = useTranslation();

  /**
   * Groups hotkeys by their subgroup property
   * Hotkeys without a subgroup are placed in the 'default' group
   *
   * @returns {GroupedHotkeys} Object with subgroup names as keys and arrays of hotkeys as values
   */
  const groupedHotkeys: GroupedHotkeys = hotkeys.reduce((groups: GroupedHotkeys, hotkey: Hotkey) => {
    const subgroup = hotkey.subgroup || "default";
    if (!groups[subgroup]) {
      groups[subgroup] = [];
    }
    groups[subgroup].push(hotkey);
    return groups;
  }, {});

  /**
   * Gets sorted subgroup names with 'default' always appearing first
   * Other subgroups are sorted alphabetically
   *
   * @returns {string[]} Sorted array of subgroup names
   */
  const subgroups: string[] = Object.keys(groupedHotkeys).sort((a: string, b: string) => {
    if (a === "default") return -1;
    if (b === "default") return 1;
    return a.localeCompare(b);
  });

  /**
   * Handles the save section button click
   */
  const handleSaveSection = (): void => {
    onSaveSection(section.id);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle>{hotkeySectionTitle(section.id, section.title)}</CardTitle>
        <CardDescription>{hotkeySectionDescription(section.id, section.description)}</CardDescription>
      </CardHeader>

      <CardContent>
        <div>
          {subgroups.map((subgroup: string) => (
            <div
              key={subgroup}
              className={clsx(subgroup !== "default" && "mt-4 pt-2 border rounded-md border-border p-3")}
            >
              {groupedHotkeys[subgroup].map((hotkey: Hotkey) => (
                <HotkeyItem
                  key={hotkey.id}
                  hotkey={hotkey}
                  onEdit={onEditHotkey}
                  onToggle={onToggleHotkey}
                  isEditing={editingHotkeyId === hotkey.id}
                  onSave={onSaveHotkey}
                  onCancel={onCancelEdit}
                />
              ))}
            </div>
          ))}

          {hotkeys.length === 0 && (
            <div className="py-8 text-center text-muted-foreground italic">
              {t("account:accountNoHotkeysInSection")}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-end">
        <Button variant="primary" onClick={handleSaveSection} disabled={!hasChanges}>
          {t("account:commonSave")}
        </Button>
      </CardFooter>
    </Card>
  );
};
