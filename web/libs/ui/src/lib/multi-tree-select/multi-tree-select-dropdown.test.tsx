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

/**
 * Poll on primitives, never on the node itself: a failing jest-dom matcher serialises the jsdom
 * element into its message, which costs ~300ms per poll here and is what pushed the requireApply
 * test past Bun's 5s timeout.
 */
const applyButton = () => screen.getByTestId("multi-tree-select-apply") as HTMLButtonElement;
const waitForApplyEnabled = (apply: HTMLButtonElement) => waitFor(() => expect(apply.disabled).toBe(false));
const waitForApplyUnmounted = () =>
  waitFor(() => expect(screen.queryAllByTestId("multi-tree-select-apply").length).toBe(0));

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
    expect(screen.getByRole("textbox", { name: "Search workspaces..." })).toBeInTheDocument();
  });

  it("accepts isRadio and preventAutoChildSelection", () => {
    const { container } = renderDropdown({
      isRadio: true,
      preventAutoChildSelection: true,
    });

    expect(container.querySelector(".ls-multi-tree-select")).toBeInTheDocument();
  });

  it("supports an accessible named trigger with FilterShell styling", () => {
    renderDropdown({
      triggerClassName: "filter-shell-trigger",
      triggerProps: {
        id: "membership-filter-control",
        "aria-label": "Membership filter",
      },
    });

    const trigger = screen.getByRole("button", { name: "Membership filter" });
    expect(trigger).toHaveAttribute("id", "membership-filter-control");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveClass("filter-shell-trigger");

    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("applies className to the root wrapper so consumers can size it", () => {
    const { container } = renderDropdown({ className: "filter-shell-tree-wrapper" });

    expect(container.querySelector(".ls-multi-tree-select")).toHaveClass("filter-shell-tree-wrapper");
  });

  /**
   * Removing and re-adding a filter pill remounts the tree with the same memoized array, which a
   * previous instance already marked as indexed. The fresh instance must still index it instead of
   * stalling on the loading spinner.
   */
  it("indexes data that a previous instance already indexed", async () => {
    const sharedData = structuredClone(mockData);

    const first = render(
      <MultiTreeSelectDropdown
        data={sharedData}
        schema={mockSchema}
        selected={[]}
        onChange={mock()}
        inline
        triggerTestId="dropdown-trigger"
      />,
    );
    first.unmount();

    render(
      <MultiTreeSelectDropdown
        data={sharedData}
        schema={mockSchema}
        selected={[]}
        onChange={mock()}
        inline
        triggerTestId="dropdown-trigger"
      />,
    );

    fireEvent.click(screen.getByTestId("dropdown-trigger"));

    expect(await screen.findByText("Workspace 1")).toBeInTheDocument();
  });

  it("renders disabled checked nodes for read-only trees", async () => {
    renderDropdown({
      selected: ["w1-p1"],
      expanded: ["w1"],
      disableAllOption: true,
      preventAutoChildSelection: true,
      data: [
        {
          id: "w1",
          label: "Workspace 1",
          disabled: true,
          children: [{ id: "p1", label: "Project 1", disabled: true, children: [] }],
        },
      ],
      triggerProps: { "aria-label": "View membership details" },
    });

    fireEvent.click(screen.getByRole("button", { name: "View membership details" }));

    const project = await screen.findByRole("checkbox", { name: "Select Project 1" });
    expect(project).toBeChecked();
    expect(project).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Select Workspace 1" })).not.toBeChecked();
  });

  it("with requireApply, defers onChange until Apply and discards on close", async () => {
    const onChange = mock();
    renderDropdown({
      disableAllOption: true,
      preventAutoChildSelection: true,
      requireApply: true,
      onChange,
      placeholder: "Any",
    });

    fireEvent.click(screen.getByTestId("dropdown-trigger"));

    await screen.findByTestId("multi-tree-select-apply");
    expect(applyButton()).toBeDisabled();

    fireEvent.click(await screen.findByRole("checkbox", { name: "Select Workspace 1" }));

    await waitForApplyEnabled(applyButton());
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(applyButton());

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
    });
    const [, selected] = onChange.mock.calls[0];
    expect(selected).toEqual(["w1"]);

    // Re-open, toggle, close without Apply — parent should not get a second emit
    onChange.mockClear();
    fireEvent.click(screen.getByTestId("dropdown-trigger"));
    fireEvent.click(await screen.findByRole("checkbox", { name: "Select Workspace 1" }));
    await waitForApplyEnabled(applyButton());
    // Close by toggling the trigger again
    fireEvent.click(screen.getByTestId("dropdown-trigger"));
    await waitForApplyUnmounted();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("without requireApply, does not render an Apply footer", async () => {
    renderDropdown({ disableAllOption: true });
    fireEvent.click(screen.getByTestId("dropdown-trigger"));
    await screen.findByText("Workspace 1");
    expect(screen.queryByTestId("multi-tree-select-apply")).not.toBeInTheDocument();
  });
});
