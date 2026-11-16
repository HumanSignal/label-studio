import clsx from "clsx";
import { Button, Typography } from "@humansignal/ui";
import { HotkeyItem } from "./Item";

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
 * Displays a section of hotkeys grouped by subgroups, as a titled section of the Hotkeys card.
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
    <section className="flex flex-col gap-base pt-wide first:pt-0" data-testid={`hotkey-section-${section.id}`}>
      <div className="flex flex-col gap-tighter">
        <Typography variant="title" size="medium">
          {section.title}
        </Typography>
        {section.description && (
          <Typography variant="body" size="small" className="text-neutral-content-subtle">
            {section.description}
          </Typography>
        )}
      </div>

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
          <div className="py-8 text-center text-muted-foreground italic">No hotkeys in this section</div>
        )}
      </div>

      <div className="flex items-center justify-end">
        <Button variant="primary" onClick={handleSaveSection} disabled={!hasChanges}>
          Save
        </Button>
      </div>
    </section>
  );
};
