import { render } from "@testing-library/react";
import { Provider } from "mobx-react";
import { Toolbar } from "../Toolbar";

jest.mock("../../../common/Utils/useWindowSize", () => ({
  useWindowSize: () => ({ width: 1024, height: 768 }),
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
    const { getByTestId } = render(
      <Provider store={mockStore}>
        <Toolbar tools={tools} expanded={false} />
      </Provider>,
    );
    expect(getByTestId("tool")).toBeInTheDocument();
  });
});
