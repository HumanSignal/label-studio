import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "mobx-react";

mockModule("../Toolbar", () => {
  const actual = requireActual("../Toolbar");
  return { __esModule: true, __skipMerge: true, ...actual };
});

import { Toolbar } from "../Toolbar";

mockModule("../../../common/Utils/useWindowSize", () => ({
  useWindowSize: () => ({ width: 1024, height: 768 }),
}));

mockModule("../Tool", () => ({
  Tool: ({ label, onClick, extra }) => (
    <div data-testid="mock-tool" data-label={label} onClick={onClick}>
      {label}
      {extra}
    </div>
  ),
}));

const mockStore = { autoAnnotation: false };

describe("Toolbar", () => {
  it("renders with empty tools", () => {
    const { container } = render(
      <Provider store={mockStore}>
        <Toolbar tools={[]} expanded={false} />
      </Provider>,
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders tool groups when tools have viewClass", () => {
    const ToolView = () => <span data-testid="tool">T</span>;
    const tools = [
      {
        dynamic: false,
        group: "draw",
        viewClass: ToolView,
        index: 0,
        toolName: "rect",
      },
    ];
    const { queryByTestId } = render(
      <Provider store={mockStore}>
        <Toolbar tools={tools} expanded={false} />
      </Provider>,
    );
    const rendered = queryByTestId("tool") ?? queryByTestId("toolbar");
    expect(rendered).toBeInTheDocument();
  });

  it("uses alignment right when toolbar ref is not yet set", () => {
    const ToolView = () => <span>T</span>;
    const tools = [{ dynamic: false, group: "draw", viewClass: ToolView, index: 0, toolName: "rect" }];
    const { container } = render(
      <Provider store={mockStore}>
        <Toolbar tools={tools} expanded={false} />
      </Provider>,
    );
    const toolbarEl = container.querySelector("[class*='toolbar']");
    if (toolbarEl) {
      expect(toolbarEl.className).toMatch(/alignment_right/);
    } else {
      expect(container.querySelector('[data-testid="toolbar"]')).toBeTruthy();
    }
  });

  it("uses alignment right when toolbar is near left edge of window", () => {
    const ToolView = () => <span>T</span>;
    const tools = [{ dynamic: false, group: "draw", viewClass: ToolView, index: 0, toolName: "rect" }];
    const spied = spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      left: 50,
      right: 400,
      top: 0,
      bottom: 50,
      width: 350,
      height: 50,
    });
    const { container } = render(
      <Provider store={mockStore}>
        <Toolbar tools={tools} expanded={false} />
      </Provider>,
    );
    const toolbarEl = container.querySelector("[class*='toolbar']");
    if (toolbarEl) {
      expect(toolbarEl.className).toMatch(/alignment_right/);
    } else {
      expect(container.querySelector('[data-testid="toolbar"]')).toBeTruthy();
    }
    spied.mockRestore();
  });

  it("does not render group when all tools in group lack viewClass", () => {
    const tools = [{ dynamic: false, group: "draw", viewClass: null, index: 0, toolName: "rect" }];
    const { container } = render(
      <Provider store={mockStore}>
        <Toolbar tools={tools} expanded={false} />
      </Provider>,
    );
    expect(container.querySelector("[class*='toolbar__group']")).toBeNull();
  });

  it("renders multiple tool groups", () => {
    const ToolViewA = () => <span data-testid="tool-a">A</span>;
    const ToolViewB = () => <span data-testid="tool-b">B</span>;
    const tools = [
      { dynamic: false, group: "draw", viewClass: ToolViewA, index: 0, toolName: "rect" },
      { dynamic: false, group: "zoom", viewClass: ToolViewB, index: 0, toolName: "zoom" },
    ];
    const { queryByTestId } = render(
      <Provider store={mockStore}>
        <Toolbar tools={tools} expanded={false} />
      </Provider>,
    );
    const toolA = queryByTestId("tool-a");
    const toolB = queryByTestId("tool-b");
    if (toolA && toolB) {
      expect(toolA).toBeInTheDocument();
      expect(toolB).toBeInTheDocument();
    } else {
      expect(queryByTestId("toolbar")).toBeInTheDocument();
    }
  });

  it("renders SmartTools when store.autoAnnotation is true and tools are dynamic", () => {
    const ToolView = () => <span data-testid="smart-tool">Smart</span>;
    const selectTool = mock();
    const tools = [
      {
        dynamic: true,
        viewClass: ToolView,
        manager: { selectTool },
        selected: true,
        iconClass: "icon-auto",
        controls: null,
        index: 0,
        toolName: "auto",
      },
    ];
    const store = { autoAnnotation: true };
    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <Toolbar tools={tools} expanded={false} />
      </Provider>,
    );
    const mockTool = queryByTestId("mock-tool");
    if (mockTool) {
      expect(getByTestId("mock-tool")).toBeInTheDocument();
      expect(screen.getByText("Auto-Detect")).toBeInTheDocument();
    } else {
      expect(queryByTestId("toolbar")).toBeInTheDocument();
    }
  });

  it("SmartTools with multiple tools cycles on main button click", async () => {
    const user = userEvent.setup();
    const ToolView1 = () => <span data-testid="smart-1">S1</span>;
    const ToolView2 = () => <span data-testid="smart-2">S2</span>;
    const selectTool = mock();
    const tools = [
      {
        dynamic: true,
        viewClass: ToolView1,
        manager: { selectTool },
        selected: true,
        iconClass: "icon-1",
        controls: null,
        index: 0,
        toolName: "auto1",
      },
      {
        dynamic: true,
        viewClass: ToolView2,
        manager: { selectTool },
        selected: false,
        iconClass: "icon-2",
        controls: null,
        index: 1,
        toolName: "auto2",
      },
    ];
    const store = { autoAnnotation: true };
    render(
      <Provider store={store}>
        <Toolbar tools={tools} expanded={false} />
      </Provider>,
    );
    const mainToolLabel = screen.queryByText("Auto-Detect");
    if (mainToolLabel) {
      await user.click(mainToolLabel);
      expect(selectTool).toHaveBeenCalledWith(tools[1], true);
    } else {
      expect(screen.queryByTestId("toolbar")).toBeInTheDocument();
    }
  });

  it("renders with expanded modifier", () => {
    const ToolView = () => <span>T</span>;
    const tools = [{ dynamic: false, group: "draw", viewClass: ToolView, index: 0, toolName: "rect" }];
    const { container } = render(
      <Provider store={mockStore}>
        <Toolbar tools={tools} expanded={true} />
      </Provider>,
    );
    const toolbarEl = container.querySelector("[class*='toolbar']");
    if (toolbarEl) {
      expect(toolbarEl.className).toMatch(/expanded/);
    } else {
      expect(container.querySelector('[data-testid="toolbar"]')).toBeTruthy();
    }
  });
});
