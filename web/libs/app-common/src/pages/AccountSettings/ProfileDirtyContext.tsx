import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Shared "unsaved changes" registry for the Profile section.
 *
 * The Profile page (`/user/account/personal-info`) stacks two independent forms that live in
 * different packages: `PersonalInfo` (OSS app-common) and the enterprise contributor profile card
 * (`WorkforceProfile`, registered as a profile extra). react-router v5 only keeps one navigation
 * `history.block` prompt active at a time, so each form cannot mount its own blocker. Instead every
 * form reports its dirty state here and a single page-level blocker reads the aggregate.
 */
type ProfileDirtyContextValue = {
  /** Report (or clear) the dirty state for a single form, keyed by a stable id. */
  setFormDirty: (id: string, dirty: boolean) => void;
  /** Register (or clear) a discard handler for a single form, keyed by the same stable id. */
  setFormDiscard: (id: string, onDiscard?: () => void) => void;
  /** Discard every registered Profile form draft and clear the aggregate dirty state. */
  discardAll: () => void;
  /** True when any registered form has unsaved changes. */
  anyDirty: boolean;
};

const ProfileDirtyContext = createContext<ProfileDirtyContextValue>({
  setFormDirty: () => {},
  setFormDiscard: () => {},
  discardAll: () => {},
  anyDirty: false,
});

export const ProfileDirtyProvider = ({ children }: { children: ReactNode }) => {
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  const discardCallbacks = useRef<Record<string, () => void>>({});

  const setFormDirty = useCallback((id: string, dirty: boolean) => {
    setDirtyMap((current) => {
      // Avoid redundant state updates (and re-renders) when nothing changed.
      if (Boolean(current[id]) === dirty) return current;
      return { ...current, [id]: dirty };
    });
  }, []);

  const setFormDiscard = useCallback((id: string, onDiscard?: () => void) => {
    if (onDiscard) {
      discardCallbacks.current[id] = onDiscard;
    } else {
      delete discardCallbacks.current[id];
    }
  }, []);

  const discardAll = useCallback(() => {
    for (const onDiscard of Object.values(discardCallbacks.current)) {
      onDiscard();
    }
    setDirtyMap({});
  }, []);

  const anyDirty = useMemo(() => Object.values(dirtyMap).some(Boolean), [dirtyMap]);

  const value = useMemo<ProfileDirtyContextValue>(
    () => ({ setFormDirty, setFormDiscard, discardAll, anyDirty }),
    [setFormDirty, setFormDiscard, discardAll, anyDirty],
  );

  return <ProfileDirtyContext.Provider value={value}>{children}</ProfileDirtyContext.Provider>;
};

/**
 * Report a form's dirty state into the surrounding {@link ProfileDirtyProvider}.
 * Each caller gets a stable auto-generated id and clears its flag on unmount.
 * Outside a provider this is a no-op, so forms still render standalone (and in isolated tests).
 */
export const useReportProfileDirty = (isDirty: boolean, onDiscard?: () => void): void => {
  const id = useId();
  const { setFormDirty, setFormDiscard } = useContext(ProfileDirtyContext);

  useEffect(() => {
    setFormDirty(id, isDirty);
  }, [id, isDirty, setFormDirty]);

  useEffect(() => {
    setFormDiscard(id, onDiscard);
  }, [id, onDiscard, setFormDiscard]);

  useEffect(
    () => () => {
      setFormDirty(id, false);
      setFormDiscard(id);
    },
    [id, setFormDirty, setFormDiscard],
  );
};

/** Read whether any registered Profile form currently has unsaved changes. */
export const useProfileFormsDirty = (): boolean => useContext(ProfileDirtyContext).anyDirty;

/** Discard all registered Profile form drafts and clear the aggregate dirty state. */
export const useDiscardProfileDrafts = (): (() => void) => useContext(ProfileDirtyContext).discardAll;
