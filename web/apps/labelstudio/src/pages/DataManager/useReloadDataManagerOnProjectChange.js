import { useEffect, useRef } from "react";

/**
 * When the SPA reuses DataManagerPage across `/projects/:id` changes, tear down
 * the existing DM so init can construct a new one (and reload project hotkeys).
 */
export function useReloadDataManagerOnProjectChange(projectId, destroyDM) {
  const previousProjectIdRef = useRef(null);

  useEffect(() => {
    const previousProjectId = previousProjectIdRef.current;
    previousProjectIdRef.current = projectId ?? null;

    if (previousProjectId != null && previousProjectId !== projectId) {
      destroyDM();
    }
  }, [projectId, destroyDM]);
}
