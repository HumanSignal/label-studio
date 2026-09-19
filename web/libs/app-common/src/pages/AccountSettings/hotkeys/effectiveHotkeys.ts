/**
 * Authoritative effective hotkeys (product defaults → account → optional project).
 * Help/DM: get(); LSF: editor_keymap via Hotkey.setKeymap.
 *
 * Call bootstrap() once after APP_SETTINGS exists (via bootstrapHotkeys side-effect
 * import in apps labelstudio main.tsx — must evaluate before ./app/App).
 * apply() is the sole publish path for runtime updates.
 */

export type CustomHotkey = { key: string; active: boolean; description?: string };
export type CustomHotkeys = Record<string, CustomHotkey>;
export type RuntimeKeymap = Record<string, Record<string, unknown>>;

const EDITOR_PREFIX = /^(annotation|timeseries|audio|regions|video|image_gallery|tools|zoomed_image):(.*)/;

export const mergeCustomHotkeys = (account: CustomHotkeys, project: CustomHotkeys): CustomHotkeys => ({
  ...account,
  ...project,
});

/** Settings ids → LSF keymap (strip section prefix; inactive → key: null). */
export const toEditorKeymap = (customs: CustomHotkeys): RuntimeKeymap => {
  const out: RuntimeKeymap = {};
  for (const [id, hotkey] of Object.entries(customs)) {
    const match = id.match(EDITOR_PREFIX);
    if (!match) continue;
    out[match[2]] = hotkey.active === false ? { ...hotkey, key: null } : { ...hotkey };
  }
  return out;
};

let productDefaults: RuntimeKeymap = {};
let accountBaseline: CustomHotkeys = {};
let effectiveMap: CustomHotkeys = {};
let bootstrapped = false;
let generation = 0;
let version = 0;
const listeners = new Set<() => void>();

const appCustoms = (): CustomHotkeys => (window.APP_SETTINGS?.user?.customHotkeys as CustomHotkeys | undefined) ?? {};

const cloneCustoms = (hotkeys: CustomHotkeys): CustomHotkeys =>
  Object.fromEntries(Object.entries(hotkeys).map(([id, hotkey]) => [id, { ...hotkey }]));

const sync = (): void => {
  const editorKeymap = { ...productDefaults, ...toEditorKeymap(effectiveMap) };
  if (window.APP_SETTINGS) {
    window.APP_SETTINGS.editor_keymap = editorKeymap;
    window.APP_SETTINGS.lookupHotkey = (id: string) => effectiveHotkeys.get(id);
  }
  try {
    (window as Window & { Htx?: { Hotkey?: { setKeymap: (k: RuntimeKeymap) => void } } }).Htx?.Hotkey?.setKeymap?.(
      editorKeymap,
    );
  } catch (error) {
    console.warn("Failed to update hotkeys:", error);
  }
  version += 1;
  for (const listener of listeners) listener();
};

export const effectiveHotkeys = {
  /**
   * Seed account baseline from APP_SETTINGS and publish derived views.
   * Idempotent. Captures product editor defaults from the pre-merge keymap.
   */
  bootstrap(): void {
    if (bootstrapped || !window.APP_SETTINGS) return;
    productDefaults = { ...((window.APP_SETTINGS.editor_keymap as RuntimeKeymap) ?? {}) };
    accountBaseline = cloneCustoms(appCustoms());
    effectiveMap = cloneCustoms(accountBaseline);
    bootstrapped = true;
    sync();
  },

  getAccountBaseline(): CustomHotkeys {
    if (!bootstrapped) effectiveHotkeys.bootstrap();
    return cloneCustoms(accountBaseline);
  },

  /**
   * Replace account baseline (+ optional project overlay) and publish to Help/DM/LSF.
   * Sole write path for runtime hotkey state.
   */
  apply({ account, project }: { account: CustomHotkeys; project?: CustomHotkeys }): void {
    if (!bootstrapped) {
      // Capture product defaults before the first publish overwrites editor_keymap.
      productDefaults = { ...((window.APP_SETTINGS?.editor_keymap as RuntimeKeymap) ?? {}) };
    }
    accountBaseline = cloneCustoms(account);
    if (window.APP_SETTINGS?.user) {
      window.APP_SETTINGS.user.customHotkeys = cloneCustoms(account);
    }
    effectiveMap = project ? mergeCustomHotkeys(accountBaseline, cloneCustoms(project)) : cloneCustoms(accountBaseline);
    bootstrapped = true;
    sync();
  },

  get(id: string): (CustomHotkey & { key: string | null }) | null {
    if (!bootstrapped) effectiveHotkeys.bootstrap();
    const hotkey = effectiveMap[id];
    if (!hotkey) return null;
    return hotkey.active === false ? { ...hotkey, key: null } : { ...hotkey };
  },

  /** Monotonic version for useSyncExternalStore snapshot caching. */
  getVersion(): number {
    if (!bootstrapped) effectiveHotkeys.bootstrap();
    // generation invalidates Help snapshots across resetForTests().
    return generation * 1_000_000 + version;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  resetForTests(): void {
    productDefaults = {};
    accountBaseline = {};
    effectiveMap = {};
    bootstrapped = false;
    generation += 1;
    version = 0;
    listeners.clear();
  },
};
