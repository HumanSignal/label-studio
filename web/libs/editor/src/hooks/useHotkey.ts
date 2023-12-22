import Keymaster from 'keymaster';
import { useEffect, useRef } from 'react';
import { Hotkey } from '../core/Hotkey';

type Keyname = keyof typeof Hotkey.keymap;

const hotkeys = Hotkey();

const attachHotkey = (key: Keyname, handler: Keymaster.KeyHandler) => {
  if (Hotkey.keymap[key]) {
    hotkeys.overwriteNamed(key as string, handler);
  } else {
    hotkeys.overwriteKey(key as string, handler);
  }
};

const removeHotkey = (key: Keyname) => {
  if (Hotkey.keymap[key]) {
    hotkeys.removeNamed(key as string);
  } else {
    hotkeys.removeKey(key as string);
  }
};

export const useHotkey = (hotkey?: Keyname, handler?: Keymaster.KeyHandler) => {
  const lastHotkey = useRef<Keyname | null>(null);
  const handlerFunction = useRef<Keymaster.KeyHandler | undefined>(handler);

  // we wanna cache handler function so the prop change does not re-attac a hotkey
  // refs are perfect fit for this purpose as they're mutable and cached during the hook lifecycle
  const handlerWrapper = useRef<Keymaster.KeyHandler>((e, h) => {
    handlerFunction.current?.(e, h);
  });

  useEffect(() => {
    const hotkeyChanged = hotkey !== lastHotkey.current;

    // hotkey itself only references a cached version of a function
    // so it's never re-attached even if handler changes
    // handler update might happen if it's wrapped with useCallback
    // and will trigger infinite loop if we use it as a dependency for
    // current effect
    (() => {
      if (!hotkeyChanged) return;

      if (hotkey) {
        attachHotkey(hotkey, handlerWrapper.current);
        lastHotkey.current = hotkey;
      } else if (lastHotkey.current && !hotkey) {
        removeHotkey(lastHotkey.current);
        lastHotkey.current = null;
      }
    })();
  }, [hotkey]);

  // by changing the ref we can safely update the handler
  // as refs are mutable and doesn't trigger react-updates
  // but the hotkey will still have access to a proper function
  useEffect(() => {
    handlerFunction.current = handler;
  }, [handler]);
};
