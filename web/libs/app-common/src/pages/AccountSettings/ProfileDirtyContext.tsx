import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from "react";

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
  /** True when any registered form has unsaved changes. */
  anyDirty: boolean;
};

const ProfileDirtyContext = createContext<ProfileDirtyContextValue>({
  setFormDirty: () => {},
  anyDirty: false,
});

export const ProfileDirtyProvider = ({ children }: { children: ReactNode }) => {
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});

  const setFormDirty = useCallback((id: string, dirty: boolean) => {
    setDirtyMap((current) => {
      // Avoid redundant state updates (and re-renders) when nothing changed.
      if (Boolean(current[id]) === dirty) return current;
      return { ...current, [id]: dirty };
    });
  }, []);

  const anyDirty = useMemo(() => Object.values(dirtyMap).some(Boolean), [dirtyMap]);

  const value = useMemo<ProfileDirtyContextValue>(() => ({ setFormDirty, anyDirty }), [setFormDirty, anyDirty]);

  return <ProfileDirtyContext.Provider value={value}>{children}</ProfileDirtyContext.Provider>;
};

/**
 * Report a form's dirty state into the surrounding {@link ProfileDirtyProvider}.
 * Each caller gets a stable auto-generated id and clears its flag on unmount.
 * Outside a provider this is a no-op, so forms still render standalone (and in isolated tests).
 */
export const useReportProfileDirty = (isDirty: boolean): void => {
  const id = useId();
  const { setFormDirty } = useContext(ProfileDirtyContext);

  useEffect(() => {
    setFormDirty(id, isDirty);
  }, [id, isDirty, setFormDirty]);

  useEffect(() => () => setFormDirty(id, false), [id, setFormDirty]);
};

/** Read whether any registered Profile form currently has unsaved changes. */
export const useProfileFormsDirty = (): boolean => useContext(ProfileDirtyContext).anyDirty;
