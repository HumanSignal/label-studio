import { fireEvent, render, screen } from "@testing-library/react";
import { JsonViewer } from "./json-viewer";
import * as jsonEditReactModule from "json-edit-react";
import * as iconsModule from "@humansignal/icons";
import * as buttonModule from "../button/button";
import * as tooltipModule from "../Tooltip/Tooltip";
import * as readerViewButtonModule from "./reader-view-button";

declare global {
  // eslint-disable-next-line no-var
  var __jsonEditorProps: any;
}

const mockMatchNode = mock(() => false);

describe("JsonViewer filtered search", () => {
  beforeEach(() => {
    global.__jsonEditorProps = undefined;
    mock.clearAllMocks();
    mockMatchNode.mockClear();

    spyOn(jsonEditReactModule, "JsonEditor").mockImplementation((props: any) => {
      global.__jsonEditorProps = props;
      return <div data-testid="json-editor" />;
    });
    spyOn(jsonEditReactModule, "matchNode").mockImplementation((...args: any[]) => mockMatchNode(...args));

    spyOn(iconsModule, "IconSearch").mockReturnValue(null);
    spyOn(iconsModule, "IconReset").mockReturnValue(null);
    spyOn(iconsModule, "IconClose").mockReturnValue(null);
    spyOn(iconsModule, "IconCopyOutline").mockReturnValue(null);

    spyOn(buttonModule, "Button").mockImplementation(({ children, onClick, ...rest }: any) => (
      <button type="button" onClick={onClick} {...rest}>
        {children}
      </button>
    ));

    spyOn(tooltipModule, "Tooltip").mockImplementation(({ children }: any) => <>{children}</>);

    spyOn(readerViewButtonModule, "ReaderViewButton").mockReturnValue(null);
  });

  it("finds key names when All filter is explicitly selected", () => {
    render(<JsonViewer data={{ id: 123, data: { image: "a.png" } }} showCopyButton={false} />);

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    fireEvent.change(screen.getByLabelText("Search JSON"), { target: { value: "id" } });

    const searchFilter = global.__jsonEditorProps.searchFilter;

    expect(typeof searchFilter).toBe("function");
    expect(searchFilter({ key: "id", value: 123, path: ["id"] }, "id")).toBe(true);
    expect(mockMatchNode).toHaveBeenCalled();
  });

  it("keeps custom filter scope while matching keys in filtered nodes", () => {
    render(
      <JsonViewer
        data={{ id: 123, data: { image: "a.png" } }}
        showCopyButton={false}
        customFilters={[
          {
            id: "data",
            label: "Data",
            filterFn: (nodeData) => {
              const path = nodeData.path;
              return path && path.includes("data");
            },
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Data" }));
    fireEvent.change(screen.getByLabelText("Search JSON"), { target: { value: "id" } });

    const searchFilter = global.__jsonEditorProps.searchFilter;

    expect(searchFilter({ key: "id", value: 123, path: ["annotations", 0, "id"] }, "id")).toBe(false);
    expect(searchFilter({ key: "id", value: 123, path: ["data", "id"] }, "id")).toBe(true);
  });
});
