import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as transitionUtils from "@humansignal/core/lib/utils/transition";
import { MultiTreeSelectDropdown } from "./multi-tree-select-dropdown";

type TransitionCallbacks = {
  beforeTransition?: () => void;
  transition?: () => void;
  afterTransition?: () => void;
};

/**
 * Do not `mockModule` Dropdown — Bun keeps that replacement for the rest of the process,
 * and it leaked into `dropdown.test.tsx` once `data-table.test.tsx` joined the suite.
 * Animate open/close synchronously; the spy is restored by preload `afterEach`.
 */
beforeEach(() => {
  const runTransitionSync = (_element: unknown, callbacks: TransitionCallbacks) => {
    callbacks.beforeTransition?.();
    callbacks.transition?.();
    callbacks.afterTransition?.();
  };
  spyOn(transitionUtils, "aroundTransition").mockImplementation(
    runTransitionSync as typeof transitionUtils.aroundTransition,
  );
});

const mockData = [
  {
    id: "w1",
    label: "Workspace 1",
    children: [{ id: "p1", label: "Project 1", children: [] }],
  },
];

const mockSchema = { id: "id", label: "label", children: "children" };

function renderDropdown(props: Record<string, unknown> = {}) {
  return render(
    <MultiTreeSelectDropdown
      data={structuredClone(mockData)}
      schema={mockSchema}
      selected={[]}
      onChange={mock()}
      inline
      triggerTestId="dropdown-trigger"
      {...props}
    />,
  );
}

describe("MultiTreeSelectDropdown", () => {
  it("renders with placeholder when disableAllOption (no selection)", async () => {
    renderDropdown({ placeholder: "Select workspaces", disableAllOption: true });

    await waitFor(() => {
      expect(screen.getByText("Select workspaces")).toBeInTheDocument();
    });
  });

  it("renders dropdown trigger and tree content", async () => {
    renderDropdown({ placeholder: "Choose..." });

    const trigger = screen.getByTestId("dropdown-trigger");
    expect(trigger).toBeInTheDocument();
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("Workspace 1")).toBeInTheDocument();
    });
  });

  it("accepts allLabel and searchPlaceholder props", async () => {
    renderDropdown({
      placeholder: "Select",
      allLabel: "All workspaces",
      searchPlaceholder: "Search workspaces...",
    });

    fireEvent.click(screen.getByTestId("dropdown-trigger"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search workspaces...")).toBeInTheDocument();
    });
  });

  it("accepts isRadio and preventAutoChildSelection", () => {
    const { container } = renderDropdown({
      isRadio: true,
      preventAutoChildSelection: true,
    });

    expect(container.querySelector(".ls-multi-tree-select")).toBeInTheDocument();
  });
});
