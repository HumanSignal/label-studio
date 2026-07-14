import { render, screen, waitFor } from "@testing-library/react";
import { MultiTreeSelectDropdown } from "./multi-tree-select-dropdown";

mockModule("../dropdown/dropdown", () => {
  const Dropdown = Object.assign(
    ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown">{children}</div>,
    {
      Trigger: ({
        children,
        content,
        ref: _ref,
      }: {
        children: React.ReactNode;
        content?: React.ReactNode;
        ref?: React.RefObject<unknown>;
      }) => (
        <div data-testid="dropdown-trigger">
          {children}
          {content && <div data-testid="dropdown-content">{content}</div>}
        </div>
      ),
    },
  );
  return {
    Dropdown,
  };
});

const mockData = [
  {
    id: "w1",
    label: "Workspace 1",
    children: [{ id: "p1", label: "Project 1", children: [] }],
  },
];

const mockSchema = { id: "id", label: "label", children: "children" };

describe("MultiTreeSelectDropdown", () => {
  it("renders with placeholder when disableAllOption (no selection)", async () => {
    render(
      <MultiTreeSelectDropdown
        data={structuredClone(mockData)}
        schema={mockSchema}
        selected={[]}
        onChange={mock()}
        placeholder="Select workspaces"
        disableAllOption={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Select workspaces")).toBeInTheDocument();
    });
  });

  it("renders dropdown trigger and tree content", async () => {
    render(
      <MultiTreeSelectDropdown
        data={structuredClone(mockData)}
        schema={mockSchema}
        selected={[]}
        onChange={mock()}
        placeholder="Choose..."
      />,
    );

    expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Workspace 1")).toBeInTheDocument();
    });
  });

  it("accepts allLabel and searchPlaceholder props", async () => {
    render(
      <MultiTreeSelectDropdown
        data={structuredClone(mockData)}
        schema={mockSchema}
        selected={[]}
        onChange={mock()}
        placeholder="Select"
        allLabel="All workspaces"
        searchPlaceholder="Search workspaces..."
      />,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search workspaces...")).toBeInTheDocument();
    });
  });

  it("accepts isRadio and preventAutoChildSelection", () => {
    const { container } = render(
      <MultiTreeSelectDropdown
        data={structuredClone(mockData)}
        schema={mockSchema}
        selected={[]}
        onChange={mock()}
        isRadio={true}
        preventAutoChildSelection={true}
      />,
    );

    expect(container.querySelector(".ls-multi-tree-select")).toBeInTheDocument();
  });
});
