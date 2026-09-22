import {
  clearDynamicHotkeySections,
  type ComponentManifestLike,
  manifestToHotkeySection,
  registerDynamicHotkeySection,
} from "./utils";

export const KNOWN_INTERFACE_COMPONENTS: Record<string, ComponentManifestLike> = {
  AudioCanvas: {
    name: "AudioCanvas",
    title: "Audio Canvas",
    description: "Shortcuts for audio waveform canvas playback, navigation, and segment editing",
    category: "audio",
    actions: {
      playPause: {
        id: "playPause",
        label: "Play / Pause Audio",
        defaultHotkey: "space",
        canonicalActionId: "audio:playpause",
        description: "Toggle audio playback",
      },
      zoomIn: {
        id: "zoomIn",
        label: "Zoom In",
        defaultHotkey: "=",
        description: "Increase waveform zoom level",
      },
      zoomOut: {
        id: "zoomOut",
        label: "Zoom Out",
        defaultHotkey: "-",
        description: "Decrease waveform zoom level",
      },
      deleteRegion: {
        id: "deleteRegion",
        label: "Delete Selected Region",
        defaultHotkey: "backspace",
        canonicalActionId: "region:delete",
        description: "Delete the currently selected audio region",
      },
      skipStart: {
        id: "skipStart",
        label: "Skip to Start",
        defaultHotkey: "",
        description: "Seek playback to the start of audio",
      },
      stepBack: {
        id: "stepBack",
        label: "Step Backward",
        defaultHotkey: "",
        canonicalActionId: "audio:step-backward",
        description: "Seek playback backward by stepSize seconds",
      },
      stepForward: {
        id: "stepForward",
        label: "Step Forward",
        defaultHotkey: "",
        canonicalActionId: "audio:step-forward",
        description: "Seek playback forward by stepSize seconds",
      },
    },
  },
};

const runtimeManifests: Record<string, ComponentManifestLike> = {};

export const registerInterfaceComponentManifest = (manifest: ComponentManifestLike): void => {
  if (manifest && manifest.name) {
    runtimeManifests[manifest.name] = manifest;
  }
};

export const getRegisteredInterfaceComponentManifests = (): Record<string, ComponentManifestLike> => ({
  ...KNOWN_INTERFACE_COMPONENTS,
  ...runtimeManifests,
});

export interface ProjectInterfaceConfig {
  id?: number;
  use_custom_interface?: boolean;
  custom_interface_code?: string | null;
  custom_interface_params?: Record<string, unknown> | null;
}

function extractMatchingBraceBlock(str: string, startIndex: number): string | null {
  let depth = 0;
  let inString: string | null = null;
  let escape = false;

  for (let i = startIndex; i < str.length; i++) {
    const char = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (inString) {
      if (char === inString) inString = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }
    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return str.slice(startIndex, i + 1);
      }
    }
  }
  return null;
}

function normalizeActions(rawActions: unknown): Record<string, any> | null {
  if (!rawActions || typeof rawActions !== "object") return null;
  if (Array.isArray(rawActions)) {
    const map: Record<string, any> = {};
    for (const act of rawActions) {
      if (act && typeof act === "object") {
        const key = act.id || act.name;
        if (key) map[key] = act;
      }
    }
    return Object.keys(map).length > 0 ? map : null;
  }
  return rawActions as Record<string, any>;
}

/**
 * Extracts bespoke hotkey declarations from params or custom interface code.
 * Supports:
 * 1. params.hotkeys: { title?: string, description?: string, actions: { ... } }
 * 2. code containing exported inline hotkeys: hotkeys: { ... }
 * 3. code containing referenced hotkeys constants: hotkeys: MY_HOTKEYS where const MY_HOTKEYS = { ... }
 */
export function extractBespokeHotkeys(
  params?: Record<string, unknown> | null,
  code?: string | null,
): ComponentManifestLike[] {
  const manifests: ComponentManifestLike[] = [];
  const seenNames = new Set<string>();

  // 1. Check params.hotkeys
  if (params && typeof params.hotkeys === "object" && params.hotkeys !== null) {
    const raw = params.hotkeys as {
      name?: string;
      title?: string;
      description?: string;
      actions?: unknown;
    };
    const actions = normalizeActions(raw.actions);
    if (actions) {
      const name = raw.name || "CustomInterface";
      seenNames.add(name);
      manifests.push({
        name,
        title: raw.title || "Custom Interface",
        description: raw.description,
        actions,
      });
    }
  }

  // 2. Scan code for declarative hotkey export pattern
  if (code && typeof code === "string") {
    try {
      // 2a. Inline hotkeys: { ... }
      const hotkeyKeyRegex = /hotkeys\s*:\s*\{/g;
      let match: RegExpExecArray | null;
      while ((match = hotkeyKeyRegex.exec(code)) !== null) {
        const braceIndex = match.index + match[0].indexOf("{");
        const block = extractMatchingBraceBlock(code, braceIndex);
        if (block) {
          try {
            const evaluated = new Function(`return (${block});`)();
            const actions = evaluated && typeof evaluated === "object" ? normalizeActions(evaluated.actions) : null;
            if (actions) {
              const name = evaluated.name || "CustomInterface";
              if (!seenNames.has(name)) {
                seenNames.add(name);
                manifests.push({
                  name,
                  title: evaluated.title || "Custom Interface Shortcuts",
                  description: evaluated.description || "Custom interface keyboard shortcuts",
                  actions,
                });
              }
            }
          } catch {
            // If direct eval fails, proceed
          }
        }
      }

      // 2b. Referenced identifier: hotkeys: IDENTIFIER
      const hotkeyRefRegex = /hotkeys\s*:\s*([A-Za-z0-9_$]+)/g;
      let refMatch: RegExpExecArray | null;
      while ((refMatch = hotkeyRefRegex.exec(code)) !== null) {
        const identifier = refMatch[1];
        if (identifier === "null" || identifier === "undefined" || identifier === "false") continue;

        // Search for const/let/var IDENTIFIER = {
        const declRegex = new RegExp(`(?:const|let|var)\\s+${identifier}\\s*=\\s*\\{`, "g");
        const declMatch = declRegex.exec(code);
        if (declMatch) {
          const braceIndex = declMatch.index + declMatch[0].indexOf("{");
          const block = extractMatchingBraceBlock(code, braceIndex);
          if (block) {
            try {
              const evaluated = new Function(`return (${block});`)();
              const actions = evaluated && typeof evaluated === "object" ? normalizeActions(evaluated.actions) : null;
              if (actions) {
                const name = evaluated.name || identifier;
                if (!seenNames.has(name)) {
                  seenNames.add(name);
                  manifests.push({
                    name,
                    title: evaluated.title || "Custom Interface Shortcuts",
                    description: evaluated.description || "Custom interface keyboard shortcuts",
                    actions,
                  });
                }
              }
            } catch {
              // Ignore eval errors
            }
          }
        }
      }
    } catch {
      // Ignore static parsing errors on dynamic source code
    }
  }

  return manifests;
}

/**
 * Synchronizes dynamic hotkey sections according to what the project actively uses.
 * When use_custom_interface is true, inspects code and params for:
 * 1. Known library components (e.g. AudioCanvas)
 * 2. Bespoke agent-built hotkeys in module exports or params
 * When use_custom_interface is false or project is null, dynamic sections are cleared.
 */
export function syncProjectInterfaceHotkeys(project?: ProjectInterfaceConfig | null): void {
  clearDynamicHotkeySections();

  if (!project || !project.use_custom_interface) {
    return;
  }

  const code = project.custom_interface_code || "";
  const params = project.custom_interface_params;
  const paramsStr = params ? JSON.stringify(params) : "";

  // 1. Check known library components
  const known = getRegisteredInterfaceComponentManifests();
  for (const [componentName, manifest] of Object.entries(known)) {
    const isReferencedInCode = new RegExp(`\\b${componentName}\\b`).test(code);
    const isReferencedInParams = paramsStr.includes(componentName);

    if (isReferencedInCode || isReferencedInParams) {
      const { section, hotkeys } = manifestToHotkeySection(manifest);
      registerDynamicHotkeySection(section, hotkeys);
    }
  }

  // 2. Check bespoke agent-built hotkeys
  const bespokeManifests = extractBespokeHotkeys(params, code);
  for (const manifest of bespokeManifests) {
    const { section, hotkeys } = manifestToHotkeySection(manifest);
    registerDynamicHotkeySection(section, hotkeys);
  }
}
