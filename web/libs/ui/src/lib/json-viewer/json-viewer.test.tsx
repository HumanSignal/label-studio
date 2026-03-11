import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { JsonViewer } from "./json-viewer";

declare global {
  // eslint-disable-next-line no-var
  var __jsonEditorProps: any;
}

jest.mock("json-edit-react", () => ({
  JsonEditor: (props: any) => {
    global.__jsonEditorProps = props;
    return <div data-testid="json-editor" />;
  },
  defaultTheme: { styles: {} },
  matchNode: jest.fn(() => false),
}));

jest.mock("@humansignal/icons", () => ({
  IconSearch: () => null,
  IconReset: () => null,
  IconClose: () => null,
  IconCopyOutline: () => null,
}));

jest.mock("../button/button", () => ({
  Button: ({ children, onClick, ...rest }: any) => (
    <button type="button" onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock("../Tooltip/Tooltip", () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
}));

jest.mock("./reader-view-button", () => ({
  ReaderViewButton: () => null,
}));

jest.mock("./json-viewer.module.scss", () => ({}));

describe("JsonViewer filtered search", () => {
  beforeEach(() => {
    global.__jsonEditorProps = undefined;
    jest.clearAllMocks();
  });

  it("finds key names when All filter is explicitly selected", () => {
    render(<JsonViewer data={{ id: 123, data: { image: "a.png" } }} showCopyButton={false} />);

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    fireEvent.change(screen.getByLabelText("Search JSON"), { target: { value: "id" } });

    const { matchNode } = require("json-edit-react");
    const searchFilter = global.__jsonEditorProps.searchFilter;

    expect(typeof searchFilter).toBe("function");
    expect(searchFilter({ key: "id", value: 123, path: ["id"] }, "id")).toBe(true);
    expect(matchNode).toHaveBeenCalled();
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
