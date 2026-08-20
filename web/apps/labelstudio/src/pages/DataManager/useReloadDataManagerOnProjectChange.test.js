import { renderHook } from "@testing-library/react";
import { useReloadDataManagerOnProjectChange } from "./useReloadDataManagerOnProjectChange";

describe("useReloadDataManagerOnProjectChange", () => {
  it("does not destroy on initial mount", () => {
    const destroyDM = mock();

    renderHook(() => useReloadDataManagerOnProjectChange(1, destroyDM));

    expect(destroyDM).not.toHaveBeenCalled();
  });

  it("destroys when project id changes so DM can re-init for the new project", () => {
    const destroyDM = mock();

    const { rerender } = renderHook(({ projectId }) => useReloadDataManagerOnProjectChange(projectId, destroyDM), {
      initialProps: { projectId: 1 },
    });

    rerender({ projectId: 2 });

    expect(destroyDM).toHaveBeenCalledTimes(1);
  });

  it("destroys when project id is cleared after a project was active", () => {
    const destroyDM = mock();

    const { rerender } = renderHook(({ projectId }) => useReloadDataManagerOnProjectChange(projectId, destroyDM), {
      initialProps: { projectId: 1 },
    });

    rerender({ projectId: undefined });

    expect(destroyDM).toHaveBeenCalledTimes(1);
  });

  it("does not destroy when the same project id is re-rendered", () => {
    const destroyDM = mock();

    const { rerender } = renderHook(({ projectId }) => useReloadDataManagerOnProjectChange(projectId, destroyDM), {
      initialProps: { projectId: 1 },
    });

    rerender({ projectId: 1 });

    expect(destroyDM).not.toHaveBeenCalled();
  });
});
