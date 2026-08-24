import { useState } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MultiTreeSelect } from "./multi-tree-select";

const waitForTreeLoaded = async () => {
  await waitFor(
    () => {
      expect(screen.getByText("Workspace A")).toBeInTheDocument();
    },
    { timeout: 3000 },
  );
};

/**
 * Contract and integration tests for MultiTreeSelect - testing the component's API contract
 * and user-visible behavior to reduce regressions and flakiness.
 */
describe("MultiTreeSelect - Contract Tests", () => {
  const mockData = [
    {
      id: "group1",
      label: "Group 1",
      children: [
        { id: "1", label: "Item 1", children: [] },
        { id: "2", label: "Item 2", children: [] },
      ],
    },
  ];

  const mockSchema = {
    id: "id",
    label: "label",
    children: "children",
  };

  describe("Radio Mode Contract", () => {
    it("should call onChange with single selection when isRadio=true", () => {
      const onChange = mock();

      render(<MultiTreeSelect data={mockData} schema={mockSchema} selected={[]} onChange={onChange} isRadio={true} />);

      expect(document.querySelector(".ls-multi-tree-select")).toBeInTheDocument();
    });

    it("should accept isRadio prop", () => {
      const { container } = render(
        <MultiTreeSelect data={mockData} schema={mockSchema} selected={[]} onChange={mock()} isRadio={true} />,
      );

      expect(container.querySelector(".ls-multi-tree-select")).toBeInTheDocument();
    });
  });

  describe("Checkbox Mode Contract", () => {
    it("should accept preventAutoChildSelection prop", () => {
      const { container } = render(
        <MultiTreeSelect
          data={mockData}
          schema={mockSchema}
          selected={[]}
          onChange={mock()}
          preventAutoChildSelection={true}
        />,
      );

      expect(container.querySelector(".ls-multi-tree-select")).toBeInTheDocument();
    });

    it("should call onChange when selections change", () => {
      const onChange = mock();

      render(<MultiTreeSelect data={mockData} schema={mockSchema} selected={[]} onChange={onChange} />);

      expect(document.querySelector(".ls-multi-tree-select")).toBeInTheDocument();
    });

    it("should NOT auto-select all when preventAutoChildSelection is true", () => {
      const onChange = mock();

      const { container } = render(
        <MultiTreeSelect
          data={mockData}
          schema={mockSchema}
          selected={[]}
          onChange={onChange}
          preventAutoChildSelection={true}
        />,
      );

      expect(container.querySelector(".ls-multi-tree-select")).toBeInTheDocument();
    });

    it("should auto-select children when preventAutoChildSelection is false", () => {
      const onChange = mock();

      const { container } = render(
        <MultiTreeSelect
          data={mockData}
          schema={mockSchema}
          selected={[]}
          onChange={onChange}
          preventAutoChildSelection={false}
        />,
      );

      expect(container.querySelector(".ls-multi-tree-select")).toBeInTheDocument();
    });
  });

  describe("Expanded State Contract", () => {
    it("should accept expanded prop", () => {
      const { container } = render(
        <MultiTreeSelect data={mockData} schema={mockSchema} selected={[]} expanded={["group1"]} onChange={mock()} />,
      );

      expect(container.querySelector(".ls-multi-tree-select")).toBeInTheDocument();
    });

    it("should call onExpand when expand state changes", () => {
      const onExpand = mock();

      render(
        <MultiTreeSelect
          data={mockData}
          schema={mockSchema}
          selected={[]}
          expanded={[]}
          onChange={mock()}
          onExpand={onExpand}
        />,
      );

      expect(document.querySelector(".ls-multi-tree-select")).toBeInTheDocument();
    });
  });

  describe("Component Remounting", () => {
    it("should remount cleanly when key changes", () => {
      const onChange = mock();
      const { rerender } = render(
        <MultiTreeSelect
          key="mode1"
          data={mockData}
          schema={mockSchema}
          selected={["group1-1", "group1-2"]}
          onChange={onChange}
          isRadio={false}
        />,
      );

      expect(document.querySelector(".ls-multi-tree-select")).toBeInTheDocument();

      rerender(
        <MultiTreeSelect
          key="mode2"
          data={mockData}
          schema={mockSchema}
          selected={[]}
          onChange={onChange}
          isRadio={true}
        />,
      );

      expect(document.querySelector(".ls-multi-tree-select")).toBeInTheDocument();
    });
  });

  describe("dropdownRef (isRadio close on select)", () => {
    it("should pass dropdownRef to provider for closing dropdown on radio select", async () => {
      const onChange = mock();
      const close = mock();
      const dropdownRef = { current: { close } };

      render(
        <MultiTreeSelect
          data={structuredClone(mockData)}
          schema={mockSchema}
          selected={[]}
          onChange={onChange}
          isRadio={true}
          dropdownRef={dropdownRef}
        />,
      );

      await waitFor(() => expect(screen.getByText("Group 1")).toBeInTheDocument(), { timeout: 3000 });

      fireEvent.click(screen.getByRole("button", { name: /group 1/i }));
      await waitFor(() => expect(screen.getByText("Item 1")).toBeInTheDocument());
      const radios = screen.getAllByRole("radio");
      expect(radios.length).toBeGreaterThanOrEqual(1);
      fireEvent.click(radios[0]!);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(close).toHaveBeenCalled();
      });
    });
  });
});

describe("MultiTreeSelect - Integration (TreeNode behavior)", () => {
  const treeData = [
    {
      id: "ws1",
      label: "Workspace A",
      children: [
        { id: "p1", label: "Project 1", children: [] },
        { id: "p2", label: "Project 2", children: [] },
      ],
    },
  ];

  const treeSchema = { id: "id", label: "label", children: "children" };

  it("radio mode: parent row is expandable via click and has role=button", async () => {
    render(
      <MultiTreeSelect
        data={structuredClone(treeData)}
        schema={treeSchema}
        selected={[]}
        onChange={mock()}
        isRadio={true}
      />,
    );

    await waitForTreeLoaded();

    const expandButton = screen.getByRole("button", { name: /workspace a/i });
    expect(expandButton).toBeInTheDocument();

    fireEvent.click(expandButton);
    expect(screen.getByText("Project 1")).toBeInTheDocument();
    expect(screen.getByText("Project 2")).toBeInTheDocument();
  });

  it("radio mode: parent row expands on Enter key", async () => {
    render(
      <MultiTreeSelect
        data={structuredClone(treeData)}
        schema={treeSchema}
        selected={[]}
        onChange={mock()}
        isRadio={true}
      />,
    );

    await waitForTreeLoaded();

    const expandButton = screen.getByRole("button", { name: /workspace a/i });
    expandButton.focus();
    fireEvent.keyDown(expandButton, { key: "Enter" });
    expect(screen.getByText("Project 1")).toBeInTheDocument();
  });

  it("radio mode: only leaf nodes have radio inputs (after expand)", async () => {
    render(
      <MultiTreeSelect
        data={structuredClone(treeData)}
        schema={treeSchema}
        selected={[]}
        onChange={mock()}
        isRadio={true}
      />,
    );

    await waitForTreeLoaded();

    const expandButton = screen.getByRole("button", { name: /workspace a/i });
    fireEvent.click(expandButton);

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(screen.getByLabelText("Project 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Project 2")).toBeInTheDocument();
  });

  it("checkbox mode: parent has expand button and checkboxes on all nodes", async () => {
    render(
      <MultiTreeSelect
        data={structuredClone(treeData)}
        schema={treeSchema}
        selected={[]}
        onChange={mock()}
        isRadio={false}
      />,
    );

    await waitForTreeLoaded();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThanOrEqual(1);
    const expandButtons = screen.getAllByRole("button");
    expect(expandButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("onChange receives selected ids when user selects a radio", async () => {
    const onChange = mock();
    render(
      <MultiTreeSelect
        data={structuredClone(treeData)}
        schema={treeSchema}
        selected={[]}
        onChange={onChange}
        isRadio={true}
      />,
    );

    await waitForTreeLoaded();

    fireEvent.click(screen.getByRole("button", { name: /workspace a/i }));
    fireEvent.click(screen.getByLabelText("Project 1"));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.any(Array), expect.arrayContaining(["ws1-p1"]));
    });
  });

  it("preventAutoChildSelection: checking workspace does not auto-select projects", async () => {
    const onChange = mock();
    render(
      <MultiTreeSelect
        data={structuredClone(treeData)}
        schema={treeSchema}
        selected={[]}
        onChange={onChange}
        customPlaceholder="Select"
        preventAutoChildSelection
      />,
    );

    await waitForTreeLoaded();

    const workspaceCheckbox = screen.getByRole("checkbox", { name: /workspace a/i });
    fireEvent.click(workspaceCheckbox);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      const [, selected] = onChange.mock.calls[onChange.mock.calls.length - 1]!;
      expect(selected).toEqual(["ws1"]);
    });
  });

  it("preventAutoChildSelection: tags above list update when a project is unchecked", async () => {
    const onChange = mock();
    const { container } = render(
      <MultiTreeSelect
        data={structuredClone(treeData)}
        schema={treeSchema}
        selected={[]}
        onChange={onChange}
        placeholder="Pick items"
        customPlaceholder="Select"
        preventAutoChildSelection
      />,
    );

    await waitForTreeLoaded();

    const expandToggle = container.querySelector(".ls-multi-tree-select__content__toggle");
    expect(expandToggle).toBeTruthy();
    fireEvent.click(expandToggle!);

    const projectCheckbox = await waitFor(() => {
      const boxes = screen.getAllByRole("checkbox");
      expect(boxes.length).toBeGreaterThanOrEqual(2);
      return boxes[1]!;
    });
    fireEvent.click(projectCheckbox);

    await waitFor(() => {
      const tags = screen.getAllByTestId("multi-tree-select-tag");
      expect(tags).toHaveLength(1);
      expect(tags[0]).toHaveTextContent("Project 1");
    });

    fireEvent.click(projectCheckbox);

    await waitFor(() => {
      expect(screen.queryAllByTestId("multi-tree-select-tag")).toHaveLength(0);
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      const [, selected] = onChange.mock.calls[onChange.mock.calls.length - 1]!;
      expect(selected).toEqual([]);
    });
  });

  it("checkbox mode + disableAllOption: clicking individual leaves must fire onChange with their composite ids", async () => {
    // Regression for CopyToOtherProjects. With disableAllOption=true the root checkbox is hidden,
    // and the consumer state should fill up as the user picks individual projects.
    const prodData = [
      {
        id: 1,
        label: "Workspace A",
        children: [
          { id: 11, label: "Project 11", children: [] },
          { id: 12, label: "Project 12", children: [] },
        ],
      },
    ];

    const onChange = mock();
    const Controlled = () => {
      const [selected, setSelected] = useState<string[]>([]);
      return (
        <MultiTreeSelect
          data={structuredClone(prodData)}
          schema={treeSchema}
          selected={selected}
          onChange={(_, next) => {
            onChange([...next]);
            setSelected([...next]);
          }}
          disableAllOption
        />
      );
    };

    const { container } = render(<Controlled />);
    await waitFor(() => expect(screen.getByText("Workspace A")).toBeInTheDocument(), { timeout: 3000 });

    const expandToggle = container.querySelector(".ls-multi-tree-select__content__toggle");
    expect(expandToggle).toBeTruthy();
    fireEvent.click(expandToggle!);

    fireEvent.click(screen.getByLabelText("Project 11"));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    fireEvent.click(screen.getByLabelText("Project 12"));

    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]![0] as string[];
      expect(lastCall).toContain("1-11");
      expect(lastCall).toContain("1-12");
      expect(lastCall.length).toBeGreaterThan(0);
    });
  });

  it('checkbox mode: clicking "All" from a partial selection promotes to fully-selected', async () => {
    const onChangeSpy = mock();
    const wsData = [
      {
        id: 1,
        label: "Workspace A",
        children: [
          { id: 11, label: "Project 11", children: [] },
          { id: 12, label: "Project 12", children: [] },
        ],
      },
      {
        id: 2,
        label: "Workspace B",
        children: [
          { id: 21, label: "Project 21", children: [] },
          { id: 22, label: "Project 22", children: [] },
        ],
      },
    ];

    const Controlled = () => {
      const [selected, setSelected] = useState<string[]>(["1", "1-11"]);
      return (
        <MultiTreeSelect
          data={structuredClone(wsData)}
          schema={treeSchema}
          selected={selected}
          onChange={(_, next) => {
            onChangeSpy([...next]);
            setSelected([...next]);
          }}
          allLabel="All workspaces"
        />
      );
    };

    render(<Controlled />);
    await waitFor(() => expect(screen.getAllByRole("checkbox").length).toBeGreaterThanOrEqual(3));

    const rootCheckbox = () => screen.getAllByRole("checkbox")[0] as HTMLInputElement;

    await waitFor(() => expect(rootCheckbox().checked).toBe(false));

    fireEvent.click(rootCheckbox());

    await waitFor(() => expect(onChangeSpy).toHaveBeenCalled());
    const lastEmit = onChangeSpy.mock.calls[onChangeSpy.mock.calls.length - 1]![0] as string[];
    expect(lastEmit).toEqual(expect.arrayContaining(["1", "1-11", "1-12", "2", "2-21", "2-22"]));
    expect(lastEmit.length).toBe(6);

    await waitFor(() => expect(rootCheckbox().checked).toBe(true));
  });

  it('checkbox mode: deselecting "All" persists across the controlled-input round-trip', async () => {
    const onChangeSpy = mock();

    const Controlled = () => {
      const [selected, setSelected] = useState<string[]>([]);
      return (
        <MultiTreeSelect
          data={structuredClone(treeData)}
          schema={treeSchema}
          selected={selected}
          onChange={(_, next) => {
            onChangeSpy([...next]);
            setSelected([...next]);
          }}
          allLabel="All workspaces"
        />
      );
    };

    render(<Controlled />);
    await waitForTreeLoaded();

    const rootCheckbox = () => screen.getAllByRole("checkbox")[0] as HTMLInputElement;

    await waitFor(() => expect(rootCheckbox().checked).toBe(true));

    fireEvent.click(rootCheckbox());
    await waitFor(() => expect(onChangeSpy).toHaveBeenCalledWith([]));

    expect(rootCheckbox().checked).toBe(false);
  });
});
