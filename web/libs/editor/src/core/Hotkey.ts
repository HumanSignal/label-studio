import keymaster from "keymaster";
import i18next from "i18next";
import { inject } from "mobx-react";
import { observer } from "mobx-react";
import { createElement, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "@humansignal/ui";
import Hint from "../components/Hint/Hint";
import { cn } from "../utils/bem";
import { isDefined, isMacOS } from "../utils/utilities";
import defaultKeymap from "./settings/keymap.json";

type Keymap = typeof defaultKeymap;

// Validate keymap integrity
const allowedKeymapKeys = ["key", "mac", "description", "modifier", "modifierDescription", "active"];

const validateKeymap = (keymap: Keymap) => {
  Object.entries(keymap).forEach(([name, settings]) => {
    Object.keys(settings).forEach((key) => {
      if (!allowedKeymapKeys.includes(key)) {
        throw new Error(`Unknown keymap property ${key} for key ${name}`);
      }
    });
  });
};

validateKeymap(defaultKeymap);

type HotkeyMap = {
  [key: string]: keymaster.KeyHandler;
};

type HotkeyNamespace = {
  description: string;
  readonly keys: HotkeyMap;
  readonly descriptions: [string, string][];
};

type HotKeyRef = {
  readonly namespace: string;
  readonly func: keymaster.KeyHandler;
};

type HotKeyRefs = {
  [key: string]: HotKeyRef[];
};

type HotkeyScopes = {
  [key: string]: HotKeyRefs;
};

const DEFAULT_SCOPE = "__main__";
const INPUT_SCOPE = "__input__";

const _hotkeys_desc: { [key: string]: string } = {};
// Maps a bound key combination (e.g. "ctrl+enter") back to the keymap id
// (e.g. "annotation:submit") that registered it, so renderers can translate
// descriptions with stable id-based i18n keys.
const _hotkeys_names: { [key: string]: string } = {};
const _namespaces: { [key: string]: HotkeyNamespace } = {};
const _destructors: (() => void)[] = [];
const _scopes: HotkeyScopes = {
  [DEFAULT_SCOPE]: {},
  [INPUT_SCOPE]: {},
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");

// Namespace titles (e.g. "Global Hotkeys") are stored in English; translate
// them lazily on access with an id derived from the title itself.
const translateNamespaceTitle = (title: string) => {
  const translated = i18next.t(`editor:hotkeysTitle_${slugify(title)}`, { defaultValue: title });

  return translated ?? title;
};

// Translate a keymap description using its stable keymap id; hotkey ids contain
// ":" (e.g. "audio:back"), so namespace/key separators must be disabled.
export const translateHotkeyDescription = (name: string, description: string) => {
  if (!name) return description;

  const translated = i18next.t(`hotkey_${name}`, {
    ns: "editor",
    nsSeparator: false,
    keySeparator: false,
    defaultValue: description,
  });

  return translated ?? description;
};

const translateNumpad = (event: any) => {
  const numPadKeyCode = event.keyCode;
  const translatedToDigit = numPadKeyCode - 48;

  document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: translatedToDigit }));
};

keymaster.filter = (event) => {
  if (keymaster.getScope() === "__none__") return false;

  const target = (event.target || event.srcElement) as HTMLElement | null;
  const tag = target?.tagName;
  const inNumberPadCodeRange = (event as any).keyCode >= 96 && (event as any).keyCode <= 105;

  if (inNumberPadCodeRange) translateNumpad(event);
  if (tag) {
    const isFormField = /^(INPUT|TEXTAREA|SELECT)$/i.test(tag);
    const isEditable = Boolean(target?.isContentEditable) || Boolean(target?.closest?.('[contenteditable="true"]'));
    keymaster.setScope(isFormField || isEditable ? INPUT_SCOPE : DEFAULT_SCOPE);
  }

  return true;
};

const ALIASES: Record<string, string> = {
  plus: "=", // "ctrl plus" is actually a "ctrl =" because shift is not used
  minus: "-",
  // Here is a magic trick. Keymaster doesn't work with comma correctly (it breaks down everything upon unbinding), but the key code for comma it expects is 188
  // And the magic is that '¼' has the same keycode. So we are going to trick keymaster to handle this in the right way.
  ",": "¼",
};

export const Hotkey = (namespace = "global", description = "Hotkeys") => {
  let _hotkeys_map: HotkeyMap = {};

  _namespaces[namespace] = _namespaces[namespace] ?? {
    get description() {
      return translateNamespaceTitle(description);
    },
    get keys() {
      return _hotkeys_map;
    },
    get descriptions() {
      const descriptions = Object.keys(this.keys).reduce<[string, string][]>((res, key) => {
        if (_hotkeys_desc[key]) res.push([key, _hotkeys_desc[key]]);

        return res;
      }, []);

      return Object.fromEntries(descriptions);
    },
  };

  // Saving handlers of current namespace to the global list for the further rebinding by necessity
  // We need this since `keymaster.unbind` works with all handlers at the same time but our logic is based on namespaces
  const addKeyHandlerRef = (scopeName: string, keyName: string, func: keymaster.KeyHandler) => {
    if (!isDefined(_scopes[scopeName])) {
      _scopes[scopeName] = {};
    }
    const scope = _scopes[scopeName];

    if (!isDefined(scope[keyName])) {
      scope[keyName] = [];
    }

    scope[keyName].push({
      namespace,
      func,
    });
  };
  // Removing handlers of current namespace from the global list
  const removeKeyHandlerRef = (scopeName: string, keyName: string) => {
    const scope = _scopes[scopeName];

    if (!scope || !scope[keyName]) return;

    scope[keyName] = scope[keyName].filter((hotKeyRef) => {
      return hotKeyRef.namespace !== namespace;
    });
  };
  // Rebinding key handlers that are still in the global list
  const rebindKeyHandlers = (scopeName: string, keyName: string) => {
    const scope = _scopes[scopeName];

    if (!scope || !scope[keyName]) return;

    scope[keyName].forEach((hotKeyRef) => {
      keymaster(keyName, scopeName, hotKeyRef.func);
    });
  };

  const getKeys = (key: string) => {
    const tokenRegex = /((?:\w+\+)*(?:[^,]+|,)),?/g;

    return [...key.replace(/\s/, "").matchAll(tokenRegex)].map((match) => match[1]);
  };

  const unbind = () => {
    for (const scope of [DEFAULT_SCOPE, INPUT_SCOPE]) {
      for (const key of Object.keys(_hotkeys_map)) {
        const keys = getKeys(key);

        for (const key of keys) {
          removeKeyHandlerRef(scope, key);
          keymaster.unbind(key, scope);
          rebindKeyHandlers(scope, key);
          delete _hotkeys_desc[key];
          delete _hotkeys_names[key];
        }
      }
    }

    _hotkeys_map = {};
  };

  _destructors.push(unbind);

  return {
    applyAliases(key: string) {
      const keys = getKeys(key);

      return keys
        .map((k) =>
          k
            .split("+")
            .map((k) => ALIASES[k.trim()] ?? k)
            .join("+"),
        )
        .join(",");
    },
    /**
     * Add key
     */
    addKey(key: string, func: keymaster.KeyHandler, desc?: string, scope: string = DEFAULT_SCOPE, name?: string) {
      if (!isDefined(key)) return;

      if (_hotkeys_map[key]) {
        console.warn(`Key already added: ${key}. It's possibly a bug.`);
      }

      const keyName = this.applyAliases(key.toLowerCase());

      _hotkeys_map[keyName] = func;
      if (desc) _hotkeys_desc[keyName] = desc;
      if (name) _hotkeys_names[keyName] = name;

      scope
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((scope) => {
          const handler: keymaster.KeyHandler = (...args) => {
            const e = args[0];

            e.stopPropagation();
            e.preventDefault();

            func(...args);
          };

          addKeyHandlerRef(scope, keyName, handler);
          keymaster(keyName, scope, handler);
        });
    },

    /**
     * Given a key temp overwrites the function, the overwrite is removed
     * after the returning function is called
     */
    overwriteKey(key: string, func: keymaster.KeyHandler, desc?: string, scope: string = DEFAULT_SCOPE, name?: string) {
      if (!isDefined(key)) return;

      if (this.hasKey(key)) {
        this.removeKey(key, scope);
      }

      this.addKey(key, func, desc, scope, name);
    },

    /**
     * Removes a shortcut
     */
    removeKey(key: string, scope: string = DEFAULT_SCOPE) {
      if (!isDefined(key)) return;

      const keyName = key.toLowerCase();

      if (this.hasKey(keyName)) {
        scope
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((scope) => {
            removeKeyHandlerRef(scope, key);
            keymaster.unbind(keyName, scope);
            rebindKeyHandlers(scope, key);
          });

        delete _hotkeys_map[keyName];
        delete _hotkeys_desc[keyName];
        delete _hotkeys_names[keyName];
      }
    },

    /**
     * Add hotkey from keymap
     */
    addNamed(name: string, func: keymaster.KeyHandler, scope?: string) {
      const hotkey = Hotkey.keymap[name as keyof Keymap];

      if (isDefined(hotkey)) {
        const shortcut = isMacOS() ? (hotkey.mac ?? hotkey.key) : hotkey.key;

        this.addKey(shortcut, func, hotkey.description, scope, name);

        if (hotkey.modifier) {
          this.addKey(`${hotkey.modifier}+${shortcut}`, func, hotkey.modifierDescription, scope, name);
        }
      } else {
        throw new Error(`Unknown named hotkey ${hotkey}`);
      }
    },

    lookupKey(name: string) {
      const hotkey = Hotkey.keymap[name as keyof Keymap];
      if (isDefined(hotkey)) {
        return isMacOS() ? (hotkey.mac ?? hotkey.key) : hotkey.key;
      }
    },

    /**
     * Removed named hotkey
     */
    removeNamed(name: string, scope?: string) {
      const hotkey = Hotkey.keymap[name as keyof Keymap];

      if (isDefined(hotkey)) {
        const shortcut = isMacOS() ? (hotkey.mac ?? hotkey.key) : hotkey.key;

        this.removeKey(shortcut, scope);

        if (hotkey.modifier) {
          this.removeKey(`${hotkey.modifier}+${shortcut}`);
        }
      } else {
        throw new Error(`Unknown named hotkey ${hotkey}`);
      }
    },

    /**
     * Add hotkey from keymap
     * @param {keyof keymap} name
     * @param {keymaster.KeyHandler} func
     * @param {DEFAULT_SCOPE | INPUT_SCOPE} scope
     */
    overwriteNamed(name: string, func: keymaster.KeyHandler, scope?: string) {
      const hotkey = Hotkey.keymap[name as keyof Keymap];

      if (isDefined(hotkey)) {
        const shortcut = isMacOS() ? (hotkey.mac ?? hotkey.key) : hotkey.key;

        this.overwriteKey(shortcut, func, hotkey.description, scope, name);

        if (hotkey.modifier) {
          this.overwriteKey(`${hotkey.modifier}+${shortcut}`, func, hotkey.modifierDescription, scope, name);
        }
      } else {
        throw new Error(`Unknown named hotkey ${name}`);
      }
    },

    hasKey(key: string) {
      if (!isDefined(key)) return;

      const keyName = key.toLowerCase();

      return isDefined(_hotkeys_map[keyName]);
    },

    hasKeyByName(name: string) {
      if (!isDefined(name)) return;

      const hotkey = Hotkey.keymap[name as keyof Keymap];

      if (!isDefined(hotkey)) {
        return false;
      }

      const shortcut = isMacOS() ? (hotkey.mac ?? hotkey.key) : hotkey.key;

      return this.hasKey(shortcut);
    },

    hasName(name: string) {
      if (!isDefined(name)) return;

      const keyName = name.toLowerCase();

      return isDefined(keyName in Hotkey.keymap);
    },

    getKeys() {
      return Object.keys(_hotkeys_map);
    },

    getNamespace() {
      return _namespaces[namespace];
    },

    addDescription(key: string, description: string) {
      if (!_hotkeys_map[key]) {
        _hotkeys_desc[key] = description;
      }
    },

    removeDescription(key: string) {
      if (!_hotkeys_map) {
        _hotkeys_desc[key];
      }
    },

    /**
     * Unbund all hotkeys
     */
    unbindAll() {
      unbind();
    },

    /**
     * Create combination
     */
    makeComb() {
      const prefix = null;
      const st = "1234567890qwetasdfgzxcvbyiopjklnm";
      const combs = st.split("");

      for (let i = 0; i <= combs.length; i++) {
        let comb;

        if (prefix) comb = `${prefix}+${combs[i]}`;
        else comb = combs[i];

        if (!Object.hasOwn(_hotkeys_map, comb)) return comb;
      }

      return null;
    },
  };
};

Hotkey.DEFAULT_SCOPE = DEFAULT_SCOPE;

Hotkey.INPUT_SCOPE = INPUT_SCOPE;

Hotkey.ALL_SCOPES = [DEFAULT_SCOPE, INPUT_SCOPE].join(",");

Hotkey.keymap = { ...defaultKeymap } as Keymap;

Hotkey.setKeymap = (newKeymap: Keymap) => {
  validateKeymap(newKeymap);

  // Replace (do not Object.assign-merge) so sparse overlays from a prior project
  // cannot leak keys that are absent from the new map.
  Hotkey.keymap = { ...defaultKeymap, ...newKeymap } as Keymap;
};

Hotkey.keysDescipritions = () => _hotkeys_desc;

/**
 * Map of bound key combinations (e.g. "ctrl+enter") to the keymap ids
 * (e.g. "annotation:submit") that registered them. Used to translate
 * hotkey descriptions in the settings table.
 */
Hotkey.comboNames = () => _hotkeys_names;

Hotkey.namespaces = () => {
  return _namespaces;
};

Hotkey.unbindAll = () => {
  _destructors.forEach((unbind) => unbind());
};

/**
 * Set scope of hotkeys
 * @param {*} scope
 */
Hotkey.setScope = (scope: string) => {
  keymaster.setScope(scope);
};

/**
 * @param {{name: keyof defaultKeymap}} param0
 */
Hotkey.Tooltip = inject("store")(
  observer(({ store, name, children, ...props }: any) => {
    const { t } = useTranslation("editor");
    const hotkey = Hotkey.keymap[name as keyof Keymap];
    const enabled = store.settings.enableTooltips && store.settings.enableHotkeys;

    if (isDefined(hotkey)) {
      const shortcut = isMacOS() ? (hotkey.mac ?? hotkey.key) : hotkey.key;

      // Prefer an explicitly provided title; otherwise translate the keymap
      // description via its stable keymap id (ids contain ":", so separators
      // must be disabled), falling back to the original English description.
      const description = isDefined(props.title)
        ? props.title
        : t(`hotkey_${String(name)}`, {
            nsSeparator: false,
            keySeparator: false,
            defaultValue: hotkey.description,
          });
      const hotkeys: JSX.Element[] = [];

      if (enabled) {
        shortcut.split(",").forEach((combination: string) => {
          const keyParts = combination.split("+");
          const keys: JSX.Element[] = [];

          keyParts.forEach((key: string, i: number) => {
            keys.push(
              createElement(
                "kbd",
                {
                  className: cn("key-group").elem("key").toClassName(),
                  key: `key-${i}`,
                },
                key,
              ),
            );
          });

          hotkeys.push(
            createElement(
              "span",
              {
                className: cn("key-group").toClassName(),
                style: { marginLeft: 5 },
              },
              ...keys,
            ),
          );
        });
      }

      return createElement(
        Tooltip,
        {
          ...props,
          theme: "light",
          title: createElement(Fragment, {}, ...[description, ...hotkeys]),
        },
        children,
      );
    }

    return children;
  }),
);

/**
 * @param {{name: keyof typeof defaultKeymap}} param0
 */
Hotkey.Hint = inject("store")(
  observer(({ store, name }: any) => {
    const hotkey = Hotkey.keymap[name as keyof Keymap];
    const enabled = store.settings.enableTooltips && store.settings.enableHotkeys;

    if (isDefined(hotkey) && enabled) {
      const shortcut = isMacOS() ? (hotkey.mac ?? hotkey.key) : hotkey.key;

      return createElement(Hint, {}, [shortcut]);
    }

    return null;
  }),
);

export type HotkeyList = keyof typeof Hotkey.keymap;

export default {
  DEFAULT_SCOPE,
  INPUT_SCOPE,
  Hotkey,
};
