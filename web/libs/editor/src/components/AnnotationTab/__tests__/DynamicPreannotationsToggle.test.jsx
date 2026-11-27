import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "mobx-react";
import { DynamicPreannotationsToggle } from "../DynamicPreannotationsToggle";

import ToolsManager from "../../../tools/Manager";
const mockSelectDefault = mock();

function createStore(overrides = {}) {
  return {
    hasInterface: mock((name) => name === "auto-annotation"),
    forceAutoAnnotation: false,
    autoAnnotation: false,
    setAutoAnnotation: mock(),
    ...overrides,
  };
}

describe("DynamicPreannotationsToggle", () => {
  beforeEach(() => {
    clearAllMocks();
    spyOn(ToolsManager, "allInstances").mockReturnValue([{ selectDefault: mockSelectDefault }]);
  });

  it("returns null when store has no auto-annotation interface", () => {
    const store = createStore({
      hasInterface: mock(() => false),
    });
    const { container } = render(
      <Provider store={store}>
        <DynamicPreannotationsToggle />
      </Provider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when store.forceAutoAnnotation is true", () => {
    const store = createStore({ forceAutoAnnotation: true });
    const { container } = render(
      <Provider store={store}>
        <DynamicPreannotationsToggle />
      </Provider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls setAutoAnnotation(false) when enabled becomes false", () => {
    const setAutoAnnotation = mock();
    const store = createStore({
      hasInterface: mock(() => false),
      setAutoAnnotation,
    });
    render(
      <Provider store={store}>
        <DynamicPreannotationsToggle />
      </Provider>,
    );
    expect(setAutoAnnotation).toHaveBeenCalledWith(false);
  });

  it("renders Auto-Annotation toggle when enabled", () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <DynamicPreannotationsToggle />
      </Provider>,
    );
    const toggle = screen.getByTestId("bottombar-auto-annotation-toggle");
    expect(toggle).toBeInTheDocument();
    expect(screen.getByText("Auto-Annotation")).toBeInTheDocument();
  });

  it("calls setAutoAnnotation when toggle is changed", async () => {
    const user = userEvent.setup();
    const setAutoAnnotation = mock();
    const store = createStore({ setAutoAnnotation });
    render(
      <Provider store={store}>
        <DynamicPreannotationsToggle />
      </Provider>,
    );
    const toggle = screen.getByTestId("bottombar-auto-annotation-toggle");
    await user.click(toggle);
    expect(setAutoAnnotation).toHaveBeenCalledWith(true);
  });

  it("calls selectDefault on all tool instances when toggle is unchecked", async () => {
    const user = userEvent.setup();
    const setAutoAnnotation = mock();
    const store = createStore({ autoAnnotation: true, setAutoAnnotation });
    render(
      <Provider store={store}>
        <DynamicPreannotationsToggle />
      </Provider>,
    );
    const toggle = screen.getByTestId("bottombar-auto-annotation-toggle");
    await user.click(toggle);
    expect(setAutoAnnotation).toHaveBeenCalledWith(false);
    expect(mockSelectDefault).toHaveBeenCalled();
  });
});
