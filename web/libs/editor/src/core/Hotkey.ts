import keymaster from 'keymaster';
import { inject } from 'mobx-react';
import { observer } from 'mobx-react';
import { createElement, Fragment } from 'react';
import { Tooltip } from '../common/Tooltip/Tooltip';
import Hint from '../components/Hint/Hint';
import { Block, Elem } from '../utils/bem';
import { FF_LSDV_1148, isFF } from '../utils/feature-flags';
import { isDefined, isMacOS } from '../utils/utilities';
import defaultKeymap from './settings/keymap.json';

// Validate keymap integrity
const allowedKeympaKeys = ['key', 'mac', 'description', 'modifier', 'modifierDescription'];

const validateKeymap = (keymap: Keymap) => {
  Object.entries(keymap).forEach(([name, settings]) => {
    Object.keys(settings).forEach(key => {
      if (!allowedKeympaKeys.includes(key)) {
        throw new Error(`Unknown keymap property ${key} for key ${name}`);
      }
    });
  });
};

validateKeymap(defaultKeymap);

type HotkeyMap = {
  [key: string]: keymaster.KeyHandler,
}

type HotkeyNamespace = {
  description: string,
  readonly keys: HotkeyMap,
  readonly descriptions: [string, string][],
}

type HotKeyRef = {
  readonly namespace: string,
  readonly func: keymaster.KeyHandler,
}

type HotKeyRefs = {
  [key: string]: HotKeyRef[],
}

type HotkeyScopes = {
  [key: string]: HotKeyRefs,
}

const DEFAULT_SCOPE = '__main__';
const INPUT_SCOPE = '__input__';

const _hotkeys_desc: { [key: string]: string } = {};
const _namespaces: {[key: string]: HotkeyNamespace} = {};
const _destructors: (() => void)[] = [];
const _scopes: HotkeyScopes = {
  [DEFAULT_SCOPE]: {},
  [INPUT_SCOPE]: {},
};

const translateNumpad = (event: any) => {
  const numPadKeyCode = event.keyCode;
  const translatedToDigit = numPadKeyCode - 48;

  document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: translatedToDigit }));
};

keymaster.filter = function(event) {
  if (keymaster.getScope() === '__none__') return false;

  const tag = (event.target || event.srcElement)?.tagName;
  const inNumberPadCodeRange = event.keyCode >= 96 && event.keyCode <= 105;

  if (inNumberPadCodeRange) translateNumpad(event);
  if (tag) {
    keymaster.setScope(/^(INPUT|TEXTAREA|SELECT)$/.test(tag) ? INPUT_SCOPE : DEFAULT_SCOPE);
  }

  return true;
};

const ALIASES = {
  'plus': '=', // "ctrl plus" is actually a "ctrl =" because shift is not used
  'minus': '-',
};

export const Hotkey = (
  namespace = 'global',
  description = 'Hotkeys',
) => {
  let _hotkeys_map: HotkeyMap = {};

  _namespaces[namespace] = _namespaces[namespace] ?? {
    description,
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

    scope[keyName] = scope[keyName].filter(hotKeyRef => {
      return hotKeyRef.namespace !== namespace;
    });
  };
  // Rebinding key handlers that are still in the global list
  const rebindKeyHandlers = (scopeName: string, keyName: string) => {
    const scope = _scopes[scopeName];

    if (!scope || !scope[keyName]) return;

    scope[keyName].forEach(hotKeyRef => {
      keymaster(keyName, scopeName, hotKeyRef.func);
    });
  };

  const unbind = () => {
    for (const scope of [DEFAULT_SCOPE, INPUT_SCOPE]) {
      for (const key of Object.keys(_hotkeys_map)) {
        if (isFF(FF_LSDV_1148)) {
          removeKeyHandlerRef(scope, key);
          keymaster.unbind(key, scope);
          rebindKeyHandlers(scope, key);
        } else {
          keymaster.unbind(key, scope);
        }
        delete _hotkeys_desc[key];
      }
    }

    _hotkeys_map = {};
  };

  _destructors.push(unbind);

  return {
    applyAliases(key: string) {
      return key
        .split(',')
        .map(k => k.split('+').map(k => ALIASES[k.trim()] ?? k).join('+'))
        .join(',');
    },
    /**
     * Add key
     */
    addKey(key: string, func: keymaster.KeyHandler, desc?: string, scope: string = DEFAULT_SCOPE) {
      if (!isDefined(key)) return;

      if (_hotkeys_map[key]) {
        console.warn(`Key already added: ${key}. It's possibly a bug.`);
      }

      const keyName = this.applyAliases(key.toLowerCase());

      _hotkeys_map[keyName] = func;
      if (desc) _hotkeys_desc[keyName] = desc;

      scope
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(scope => {
          const handler:keymaster.KeyHandler = (...args) => {
            const e = args[0];

            e.stopPropagation();
            e.preventDefault();

            func(...args);
          };

          if (isFF(FF_LSDV_1148)) {
            addKeyHandlerRef(scope, keyName, handler);
          }
          keymaster(keyName, scope, handler);
        });
    },

    /**
     * Given a key temp overwrites the function, the overwrite is removed
     * after the returning function is called
     */
    overwriteKey(key: string, func: keymaster.KeyHandler, desc?: string, scope: string = DEFAULT_SCOPE) {
      if (!isDefined(key)) return;

      if (this.hasKey(key)) {
        this.removeKey(key, scope);
      }

      this.addKey(key, func, desc, scope);
    },

    /**
     * Removes a shortcut
     */
    removeKey(key: string, scope: string = DEFAULT_SCOPE) {
      if (!isDefined(key)) return;

      const keyName = key.toLowerCase();

      if (this.hasKey(keyName)) {
        scope
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .forEach(scope => {
            if (isFF(FF_LSDV_1148)) {
              removeKeyHandlerRef(scope, key);
              keymaster.unbind(keyName, scope);
              rebindKeyHandlers(scope, key);
            } else {
              keymaster.unbind(keyName, scope);
            }
          });

        delete _hotkeys_map[keyName];
        delete _hotkeys_desc[keyName];
      }
    },

    /**
     * Add hotkey from keymap
     */
    addNamed(name: string, func: keymaster.KeyHandler, scope?: string) {
      const hotkey = Hotkey.keymap[name];

      if (isDefined(hotkey)) {
        const shortcut = isMacOS() ? hotkey.mac ?? hotkey.key : hotkey.key;

        this.addKey(shortcut, func, hotkey.description, scope);

        if (hotkey.modifier) {
          this.addKey(`${hotkey.modifier}+${shortcut}`, func, hotkey.modifierDescription, scope);
        }
      } else {
        throw new Error(`Unknown named hotkey ${hotkey}`);
      }
    },

    /**
     * Removed named hotkey
     */
    removeNamed(name: string, scope?: string) {
      const hotkey = Hotkey.keymap[name];

      if (isDefined(hotkey)) {
        const shortcut = isMacOS() ? hotkey.mac ?? hotkey.key : hotkey.key;

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
      const hotkey = Hotkey.keymap[name];

      if (isDefined(hotkey)) {
        const shortcut = isMacOS() ? hotkey.mac ?? hotkey.key : hotkey.key;

        this.overwriteKey(shortcut, func, hotkey.description, scope);

        if (hotkey.modifier) {
          this.overwriteKey(`${hotkey.modifier}+${shortcut}`, func, hotkey.modifierDescription, scope);
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
      const st = '1234567890qwetasdfgzxcvbyiopjklnm';
      const combs = st.split('');

      for (let i = 0; i <= combs.length; i++) {
        let comb;

        if (prefix) comb = prefix + '+' + combs[i];
        else comb = combs[i];

        if (!{}.hasOwnProperty.call(_hotkeys_map, comb)) return comb;
      }

      return null;
    },
  };
};

Hotkey.DEFAULT_SCOPE = DEFAULT_SCOPE;

Hotkey.INPUT_SCOPE = INPUT_SCOPE;

Hotkey.keymap = { ...defaultKeymap } as Keymap;

Hotkey.setKeymap = (newKeymap: Keymap) => {
  validateKeymap(newKeymap);

  Object.assign(Hotkey.keymap, newKeymap);
};

Hotkey.keysDescipritions = function() {
  return _hotkeys_desc;
};

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
Hotkey.setScope = function(scope: string) {
  keymaster.setScope(scope);
};

/**
 * @param {{name: keyof defaultKeymap}} param0
 */
Hotkey.Tooltip = inject('store')(observer(({ store, name, children, ...props }: any) => {
  const hotkey = Hotkey.keymap[name as string];
  const enabled = store.settings.enableTooltips && store.settings.enableHotkeys;

  if (isDefined(hotkey)) {
    const shortcut = isMacOS() ? hotkey.mac ?? hotkey.key : hotkey.key;

    const description = props.title ?? hotkey.description;
    const hotkeys: JSX.Element[] = [];

    if (enabled) {
      shortcut.split(',').forEach((combination) => {
        const keys = combination
          .split('+')
          .map(key => createElement(Elem, {
            tag: 'kbd',
            name: 'key',
          }, key));

        hotkeys.push(createElement(Block, {
          name: 'key-group',
          tag: 'span',
          style: { marginLeft: 5 },
        }, ...keys));
      });
    }

    return createElement(Tooltip, {
      ...props,
      theme: 'light',
      title: createElement(Fragment, {}, ...[description,...hotkeys]),
    }, children);
  }

  return children;
}));

/**
 * @param {{name: keyof typeof defaultKeymap}} param0
 */
Hotkey.Hint = inject('store')(observer(({ store, name }: any) => {
  const hotkey = Hotkey.keymap[name];
  const enabled = store.settings.enableTooltips && store.settings.enableHotkeys;

  if (isDefined(hotkey) && enabled) {
    const shortcut = isMacOS() ? hotkey.mac ?? hotkey.key : hotkey.key;

    return createElement(Hint, {}, [shortcut]);
  }

  return null;
}));

export default {
  DEFAULT_SCOPE,
  INPUT_SCOPE,
  Hotkey,
};
