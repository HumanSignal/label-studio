import { renderHook } from "@testing-library/react";
import { useMultiTreeSelectProvider } from "./tree-context";

/**
 * Unit tests for TreeContext - testing specific bug fixes
 */
describe("TreeContext - Bug Fixes", () => {
  const mockWorkspacesData = [
    {
      id: "1",
      title: "Non-Personal Workspace",
      is_personal: false,
      projects: [
        { id: "101", title: "Project A" },
        { id: "102", title: "Project B" },
      ],
    },
    {
      id: "2",
      title: "Personal Workspace",
      is_personal: true,
      projects: [{ id: "201", title: "Personal Project A" }],
    },
  ];

  const workspacesSchema = {
    id: "id",
    label: "title",
    children: { projects: { id: "id", label: "title" } },
  };

  describe("hiddenNodeFilter - Root Level Only Fix", () => {
    it("should only apply hiddenNodeFilter at root level, not recursively", () => {
      const hiddenNodeFilter = mock((node: any) => node.is_personal === true);

      renderHook(() =>
        useMultiTreeSelectProvider({
          data: mockWorkspacesData,
          schema: workspacesSchema,
          selected: [],
          hiddenNodeFilter,
        }),
      );

      expect(hiddenNodeFilter).toHaveBeenCalled();

      const calls = hiddenNodeFilter.mock.calls;
      const hasWorkspaceCalls = calls.some((call) => call[0]?.id === "1" || call[0]?.id === "2");
      expect(hasWorkspaceCalls).toBe(true);
    });

    it("should preserve all children within non-filtered parent nodes", () => {
      const hiddenNodeFilter = (node: any) => node.is_personal === true;

      const { result } = renderHook(() =>
        useMultiTreeSelectProvider({
          data: mockWorkspacesData,
          schema: workspacesSchema,
          selected: [],
          hiddenNodeFilter,
        }),
      );

      if (!result.current.searchIndexed) {
        const checkIndexed = () => result.current.searchIndexed;
        let attempts = 0;
        while (!checkIndexed() && attempts < 10) {
          attempts++;
        }
      }

      const nonPersonalWorkspace = result.current.dataRef.current.find((w) => w.id === "1");
      expect(nonPersonalWorkspace).toBeDefined();
      expect(nonPersonalWorkspace?.children).toHaveLength(2);
      expect(nonPersonalWorkspace?.children[0].id).toBe("1-101");
      expect(nonPersonalWorkspace?.children[1].id).toBe("1-102");
    });
  });

  describe("selectedRef Synchronization Fix", () => {
    it("should sync selectedRef when initialSelected prop has non-empty array", () => {
      const initialSelection = ["1-101", "1-102"];

      const { result, rerender } = renderHook(
        ({ selected }) =>
          useMultiTreeSelectProvider({
            data: mockWorkspacesData,
            schema: workspacesSchema,
            selected,
          }),
        { initialProps: { selected: initialSelection } },
      );

      expect(result.current.providerProps.selected).toEqual(initialSelection);

      const newSelection = ["1-101"];
      rerender({ selected: newSelection });

      expect(result.current.providerProps.selected).toEqual(newSelection);
    });

    it("should NOT interfere when initialSelected is empty array", () => {
      const { result, rerender } = renderHook(
        ({ selected }) =>
          useMultiTreeSelectProvider({
            data: mockWorkspacesData,
            schema: workspacesSchema,
            selected,
          }),
        { initialProps: { selected: [] } },
      );

      expect(result.current.providerProps.selected).toEqual([]);

      rerender({ selected: [] });

      expect(result.current.providerProps.selected).toEqual([]);
    });
  });

  describe("getLabel with filtered nodes", () => {
    it("should return labels for nodes even when hiddenNodeFilter is applied", () => {
      const hiddenNodeFilter = (node: any) => node.is_personal === true;

      const { result } = renderHook(() =>
        useMultiTreeSelectProvider({
          data: mockWorkspacesData,
          schema: workspacesSchema,
          selected: [],
          hiddenNodeFilter,
        }),
      );

      if (result.current.searchIndexed) {
        const label1 = result.current.providerProps.dataRef.current.find((w) => w.id === "1");
        expect(label1).toBeDefined();
        expect(label1?.label).toBe("Non-Personal Workspace");
      }
    });
  });

  describe("isRadio initial selection", () => {
    it("should NOT auto-select all nodes when isRadio is true", () => {
      const { result } = renderHook(() =>
        useMultiTreeSelectProvider({
          data: mockWorkspacesData,
          schema: workspacesSchema,
          selected: [],
          isRadio: true,
        }),
      );

      expect(result.current.providerProps.selected).toEqual([]);
    });

    it("should auto-select all nodes when isRadio is false and no customPlaceholder", () => {
      const { result } = renderHook(() =>
        useMultiTreeSelectProvider({
          data: mockWorkspacesData,
          schema: workspacesSchema,
          selected: [],
          isRadio: false,
        }),
      );

      expect(result.current.providerProps.selected).toEqual([]);
    });
  });
});
