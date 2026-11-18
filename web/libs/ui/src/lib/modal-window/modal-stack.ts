import { useLayoutEffect, useRef, useSyncExternalStore } from "react";

type Entry = { id: symbol; scrim: boolean };

/** The open modals, in the order they opened. The last one is the one on top. */
let stack: Entry[] = [];
const listeners = new Set<() => void>();

const setStack = (next: Entry[]) => {
  stack = next;
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getStack = () => stack;

/**
 * Where an open modal sits among the open modals. Only the one on top is shown: a modal that opens another
 * stays mounted underneath, so it comes back with its state when the one on top closes. The whole stack
 * shares the scrim of its lowest modal, so the page does not get darker with every level.
 */
export function useModalStack(open: boolean, scrim: boolean): { covered: boolean; ownsScrim: boolean } {
  const id = useRef(Symbol("modal")).current;
  const entries = useSyncExternalStore(subscribe, getStack, getStack);

  useLayoutEffect(() => {
    if (!open) return;
    setStack([...stack, { id, scrim }]);
    return () => setStack(stack.filter((entry) => entry.id !== id));
  }, [open, scrim, id]);

  const index = entries.findIndex((entry) => entry.id === id);
  const scrimOwner = entries.find((entry) => entry.scrim)?.id;

  return {
    covered: index !== -1 && index < entries.length - 1,
    // Before it registers, a modal owns the scrim only when no open modal already shows one
    ownsScrim: scrim && (scrimOwner === undefined || scrimOwner === id),
  };
}
