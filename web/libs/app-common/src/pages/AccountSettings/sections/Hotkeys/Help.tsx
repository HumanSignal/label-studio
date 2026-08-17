import { useCallback, useMemo, useSyncExternalStore } from "react";
import { modal } from "@humansignal/ui/lib/modal";
import clsx from "clsx";
import i18next from "i18next";
import { useTranslation } from "react-i18next";
import { getProjectHotkeysSettingsPath, getProjectIdFromPathname } from "@humansignal/core/lib/utils/hotkeysProject";
import { effectiveHotkeys } from "../../hotkeys/effectiveHotkeys";
import { KeyboardKey } from "./Key";
// @ts-ignore
import { HOTKEY_SECTIONS, URL_TO_SECTION_MAPPING } from "./defaults";
import type { Hotkey, Section } from "./utils";
import { getTypedDefaultHotkeys, hotkeySectionDescription, hotkeySectionTitle } from "./utils";

interface UrlMapping {
  regex: RegExp;
  section: string | string[];
}

interface GroupedHotkeys {
  [subgroup: string]: Hotkey[];
}

interface ModalReturn {
  close: () => void | Promise<void>;
}

interface HotkeyHelpModalProps {
  sectionsToShow: string[];
}

const sections = HOTKEY_SECTIONS as Section[];
const urlMappings = URL_TO_SECTION_MAPPING as UrlMapping[];

const resolveCurrentHotkeys = (): Hotkey[] => {
  const defaultHotkeys = getTypedDefaultHotkeys();

  return defaultHotkeys.map((hotkey: Hotkey) => {
    const lookupKey = `${hotkey.section}:${hotkey.element}`;
    const customSetting = effectiveHotkeys.get(lookupKey);
    if (customSetting) {
      return {
        ...hotkey,
        key: customSetting.key ?? "",
        active: customSetting.active ?? hotkey.active,
        ...(customSetting.description && {
          description: customSetting.description,
        }),
      };
    }
    return hotkey;
  });
};

let helpSnapshot: Hotkey[] | null = null;
let helpSnapshotVersion = -1;

const getHelpHotkeysSnapshot = (): Hotkey[] => {
  const version = effectiveHotkeys.getVersion();
  if (helpSnapshot && version === helpSnapshotVersion) return helpSnapshot;
  helpSnapshot = resolveCurrentHotkeys();
  helpSnapshotVersion = version;
  return helpSnapshot;
};

const useCurrentHotkeys = (): Hotkey[] =>
  useSyncExternalStore(effectiveHotkeys.subscribe, getHelpHotkeysSnapshot, getHelpHotkeysSnapshot);

const HotkeyHelpModal = ({ sectionsToShow }: HotkeyHelpModalProps) => {
  const { t } = useTranslation();
  const hotkeys = useCurrentHotkeys();
  const projectId = getProjectIdFromPathname(window.location.pathname);
  const customizationPath = projectId ? getProjectHotkeysSettingsPath(projectId) : "/user/account/hotkeys";
  const customizationLabel = projectId ? t("account:accountCustomizeForProject") : t("account:accountCustomizeHotkeys");

  const handleCustomizeClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      window.location.href = customizationPath;
    },
    [customizationPath],
  );

  const renderSection = useCallback(
    (sectionId: string) => {
      const section = sections.find((s: Section) => s.id === sectionId);
      if (!section) return null;

      const sectionHotkeys = hotkeys.filter((h: Hotkey) => h.section === sectionId);
      if (sectionHotkeys.length === 0) return null;

      const groupedHotkeys = sectionHotkeys.reduce((groups: GroupedHotkeys, hotkey: Hotkey) => {
        const subgroup = hotkey.subgroup || "default";
        if (!groups[subgroup]) {
          groups[subgroup] = [];
        }
        groups[subgroup].push(hotkey);
        return groups;
      }, {});

      const subgroups = Object.keys(groupedHotkeys).sort((a, b) => {
        if (a === "default") return -1;
        if (b === "default") return 1;
        return a.localeCompare(b);
      });

      return (
        <div key={sectionId} className="border border-neutral-border rounded-lg">
          <div className="px-4 py-3 border-b border-neutral-border">
            <h3 className="font-medium">{hotkeySectionTitle(section.id, section.title)}</h3>
            <p className="text-sm text-neutral-content-subtler">
              {hotkeySectionDescription(section.id, section.description)}
            </p>
          </div>

          <div className="p-4">
            <div className="space-y-2">
              {subgroups.map((subgroup) => (
                <div
                  key={subgroup}
                  className={clsx(subgroup !== "default" && "mt-4 pt-2 border rounded-md border-neutral-border p-3")}
                >
                  {subgroup !== "default" && (
                    <div className="mb-3">
                      <div className="text-sm font-medium mb-1 capitalize">
                        {(() => {
                          const subgroupSection = sections.find((s: Section) => s.id === subgroup);
                          return subgroupSection
                            ? hotkeySectionTitle(subgroupSection.id, subgroupSection.title)
                            : subgroup;
                        })()}
                      </div>
                      {(() => {
                        const subgroupSection = sections.find((s: Section) => s.id === subgroup);
                        const description =
                          subgroupSection && hotkeySectionDescription(subgroupSection.id, subgroupSection.description);
                        return description ? (
                          <div className="text-xs text-neutral-content-subtler">{description}</div>
                        ) : null;
                      })()}
                    </div>
                  )}

                  {groupedHotkeys[subgroup].map((hotkey: Hotkey) => (
                    <div key={`${section.id}-${hotkey.element}`} className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium text-neutral-content">{hotkey.label}</div>
                        {hotkey.description && (
                          <div className="text-sm text-neutral-content-subtler">{hotkey.description}</div>
                        )}
                      </div>
                      {hotkey.active === false || !hotkey.key ? (
                        <span className="text-sm text-neutral-content-subtler">
                          {t("account:accountDisabledLabel")}
                        </span>
                      ) : (
                        <KeyboardKey>{hotkey.key}</KeyboardKey>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    },
    [hotkeys, t],
  );

  const modalContent = useMemo(
    () => (
      <div className="max-w-3xl max-h-[90vh] h-full overflow-hidden w-full mx-4 flex flex-col">
        <div className="px-wide py-base border-b border-neutral-border">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{t("account:accountKeyboardShortcutsTitle")}</h2>
          </div>
          <p className="text-sm text-neutral-content-subtler mt-1">
            {t("account:accountViewAllShortcuts")}&nbsp;
            <a
              href={customizationPath}
              onClick={handleCustomizeClick}
              className="text-primary-content hover:underline hover:text-primary-content-hover"
            >
              {customizationLabel}
            </a>
          </p>
        </div>

        <div className="px-wide py-wide overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-border-bold scrollbar-track-transparent">
          <div className="space-y-wide">{sectionsToShow.map((sectionId) => renderSection(sectionId))}</div>
        </div>
      </div>
    ),
    [sectionsToShow, renderSection, customizationPath, customizationLabel, handleCustomizeClick, t],
  );

  return modalContent;
};

const determineSectionsToShow = (sectionOrUrl?: string | string[]): string[] => {
  let sectionsToShow: string[] = [];

  if (sectionOrUrl) {
    if (typeof sectionOrUrl === "string" && (sectionOrUrl.startsWith("http") || sectionOrUrl.startsWith("/"))) {
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
      sectionsToShow = Array.isArray(sectionOrUrl) ? sectionOrUrl : [sectionOrUrl];
    }
  } else {
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

  sectionsToShow = [...new Set(sectionsToShow)];

  if (sectionsToShow.length === 0) {
    sectionsToShow = sections.map((section: Section) => section.id);
  }

  return sectionsToShow;
};

export const openHotkeyHelp = (sectionOrUrl?: string | string[]): ModalReturn => {
  const sectionsToShow = determineSectionsToShow(sectionOrUrl);

  const modalInstance = modal({
    title: i18next.t("account:accountKeyboardShortcutsTitle"),
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
