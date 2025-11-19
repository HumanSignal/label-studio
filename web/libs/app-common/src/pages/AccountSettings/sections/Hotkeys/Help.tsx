import { useMemo, useCallback } from "react";
import { modal } from "@humansignal/ui/lib/modal";
import clsx from "clsx";
import { KeyboardKey } from "./Key";
// @ts-ignore
import { HOTKEY_SECTIONS, URL_TO_SECTION_MAPPING } from "./defaults";
import type { Hotkey, Section } from "./utils";
import { getTypedDefaultHotkeys } from "./utils";

// Type definitions for imported constants
interface UrlMapping {
  regex: RegExp;
  section: string | string[];
}

interface GroupedHotkeys {
  [subgroup: string]: Hotkey[];
}

interface ModalReturn {
  close: () => void;
}

interface HotkeyHelpModalProps {
  sectionsToShow: string[];
}

// Type the imported constants
const sections = HOTKEY_SECTIONS as Section[];
const urlMappings = URL_TO_SECTION_MAPPING as UrlMapping[];

/**
 * Hook to get current hotkeys with customizations
 */
const useCurrentHotkeys = (): Hotkey[] => {
  return useMemo(() => {
    const defaultHotkeys = getTypedDefaultHotkeys();
    const customHotkeys = window.APP_SETTINGS?.user?.customHotkeys || {};

    return defaultHotkeys.map((hotkey: Hotkey) => {
      const lookupKey = `${hotkey.section}:${hotkey.element}`;
      if (customHotkeys[lookupKey]) {
        const customSetting = customHotkeys[lookupKey];
        return {
          ...hotkey,
          key: customSetting.key,
          active: customSetting.active,
          ...(customSetting.description && {
            description: customSetting.description,
          }),
        };
      }
      return hotkey;
    });
  }, []);
};

/**
 * Main modal component that displays keyboard shortcuts
 * Renders shortcuts organized by sections and subgroups
 */
const HotkeyHelpModal = ({ sectionsToShow }: HotkeyHelpModalProps) => {
  const hotkeys = useCurrentHotkeys();

  /**
   * Navigates to hotkey customization page
   */
  const handleCustomizeClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = "/user/account/hotkeys";
  }, []);

  /**
   * Renders a single hotkey section with its shortcuts
   */
  const renderSection = useCallback(
    (sectionId: string) => {
      const section = sections.find((s: Section) => s.id === sectionId);
      if (!section) return null;

      const sectionHotkeys = hotkeys.filter((h: Hotkey) => h.section === sectionId);
      if (sectionHotkeys.length === 0) return null;

      // Group hotkeys by subgroup for better organization
      const groupedHotkeys = sectionHotkeys.reduce((groups: GroupedHotkeys, hotkey: Hotkey) => {
        const subgroup = hotkey.subgroup || "default";
        if (!groups[subgroup]) {
          groups[subgroup] = [];
        }
        groups[subgroup].push(hotkey);
        return groups;
      }, {});

      // Sort subgroups with 'default' always first
      const subgroups = Object.keys(groupedHotkeys).sort((a, b) => {
        if (a === "default") return -1;
        if (b === "default") return 1;
        return a.localeCompare(b);
      });

      return (
        <div key={sectionId} className="border border-neutral-border rounded-lg">
          {/* Section Header */}
          <div className="px-4 py-3 border-b border-neutral-border">
            <h3 className="font-medium">{section.title}</h3>
            <p className="text-sm text-neutral-content-subtler">{section.description}</p>
          </div>

          {/* Section Content */}
          <div className="p-4">
            <div className="space-y-2">
              {subgroups.map((subgroup) => (
                <div
                  key={subgroup}
                  className={clsx(subgroup !== "default" && "mt-4 pt-2 border rounded-md border-neutral-border p-3")}
                >
                  {/* Subgroup Header */}
                  {subgroup !== "default" && (
                    <div className="mb-3">
                      <div className="text-sm font-medium mb-1 capitalize">
                        {sections.find((s: Section) => s.id === subgroup)?.title || subgroup}
                      </div>
                      {sections.find((s: Section) => s.id === subgroup)?.description && (
                        <div className="text-xs text-neutral-content-subtler">
                          {sections.find((s: Section) => s.id === subgroup)?.description}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hotkey Items */}
                  {groupedHotkeys[subgroup].map((hotkey: Hotkey) => (
                    <div key={`${section.id}-${hotkey.element}`} className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium text-neutral-content">{hotkey.label}</div>
                        {hotkey.description && (
                          <div className="text-sm text-neutral-content-subtler">{hotkey.description}</div>
                        )}
                      </div>
                      <KeyboardKey>{hotkey.key}</KeyboardKey>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    },
    [hotkeys],
  );

  const modalContent = useMemo(
    () => (
      <div className="max-w-3xl max-h-[90vh] h-full overflow-hidden w-full mx-4 flex flex-col">
        <div className="px-wide py-base border-b border-neutral-border">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          </div>
          <p className="text-sm text-neutral-content-subtler mt-1">
            View all available keyboard shortcuts.&nbsp;
            <a
              href="/user/account/hotkeys"
              onClick={handleCustomizeClick}
              className="text-primary-content hover:underline hover:text-primary-content-hover"
            >
              Customize
            </a>
          </p>
        </div>

        <div className="px-wide py-wide overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-border-bold scrollbar-track-transparent">
          <div className="space-y-wide">{sectionsToShow.map((sectionId) => renderSection(sectionId))}</div>
        </div>
      </div>
    ),
    [sectionsToShow, renderSection, handleCustomizeClick],
  );

  return modalContent;
};

/**
 * Determines which hotkey sections to display based on URL or explicit section names
 */
const determineSectionsToShow = (sectionOrUrl?: string | string[]): string[] => {
  let sectionsToShow: string[] = [];

  if (sectionOrUrl) {
    // Check if input is a URL
    if (typeof sectionOrUrl === "string" && (sectionOrUrl.startsWith("http") || sectionOrUrl.startsWith("/"))) {
      // Apply URL-to-section mapping
      for (const mapping of urlMappings) {
        if (mapping.regex.test(sectionOrUrl)) {
          if (Array.isArray(mapping.section)) {
            sectionsToShow = [...sectionsToShow, ...mapping.section];
          } else {
            sectionsToShow.push(mapping.section);
          }
        }
      }
    } else {
      // Input is section name(s)
      sectionsToShow = Array.isArray(sectionOrUrl) ? sectionOrUrl : [sectionOrUrl];
    }
  } else {
    // Use current URL if no input provided
    const currentUrl = window.location.pathname + window.location.search;
    for (const mapping of urlMappings) {
      if (mapping.regex.test(currentUrl)) {
        if (Array.isArray(mapping.section)) {
          sectionsToShow = [...sectionsToShow, ...mapping.section];
        } else {
          sectionsToShow.push(mapping.section);
        }
      }
    }
  }

  // Remove duplicates
  sectionsToShow = [...new Set(sectionsToShow)];

  // Show all sections if none were identified
  if (sectionsToShow.length === 0) {
    sectionsToShow = sections.map((section: Section) => section.id);
  }

  return sectionsToShow;
};

/**
 * Creates and displays a modal with keyboard shortcuts
 * Automatically determines which shortcuts to show based on current page or provided sections
 * The modal automatically gets current hotkeys including any customizations
 *
 * @param {string|string[]} [sectionOrUrl] - Optional URL or section name(s) to determine which shortcuts to display
 *                                         - If URL: uses regex mapping to find relevant sections
 *                                         - If string: shows that specific section
 *                                         - If array: shows multiple specific sections
 *                                         - If undefined: auto-detects from current URL
 *
 * @example
 * // Show shortcuts for current page
 * openHotkeyHelp();
 *
 * // Show shortcuts for specific section
 * openHotkeyHelp('annotation');
 *
 * // Show shortcuts for multiple sections
 * openHotkeyHelp(['annotation', 'regions']);
 *
 * // Show shortcuts based on URL
 * openHotkeyHelp('/projects/123/data/?task=456');
 */
export const openHotkeyHelp = (sectionOrUrl?: string | string[]): ModalReturn => {
  const sectionsToShow = determineSectionsToShow(sectionOrUrl);

  const modalInstance = modal({
    title: "Keyboard Shortcuts",
    body: () => <HotkeyHelpModal sectionsToShow={sectionsToShow} />,
    bare: true,
    allowClose: true,
    width: 768,
    style: {
      maxWidth: "90vw",
      maxHeight: "90vh",
      height: "auto",
    },
  });

  return {
    close: () => modalInstance.close(),
  };
};
