import { fireEvent, render, screen } from "@testing-library/react";
import { ff } from "@humansignal/core";
import type { Mock } from "bun:test";
import { JsonViewer } from "./json-viewer";
import * as jsonEditReactModule from "json-edit-react";
import * as virtualizedInnerModule from "./virtualized-json-viewer-inner";
import * as iconsModule from "@humansignal/icons";
import * as buttonModule from "../button/button";
import * as tooltipModule from "../Tooltip/Tooltip";

declare global {
  // eslint-disable-next-line no-var
  var __virtualizedJsonViewerProps: virtualizedInnerModule.VirtualizedJsonViewerInnerProps | undefined;
}

describe("JsonViewer feature flag", () => {
  beforeEach(() => {
    global.__virtualizedJsonViewerProps = undefined;

    spyOn(jsonEditReactModule, "JsonEditor").mockImplementation(() => <div data-testid="json-editor" />);

    spyOn(virtualizedInnerModule, "VirtualizedJsonViewerInner").mockImplementation((props) => {
      global.__virtualizedJsonViewerProps = props;
      return <div data-testid="virtualized-json-viewer-inner" />;
    });

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
  });

  it("renders legacy json-edit-react path when flag is off", () => {
    spyOn(ff, "isActive").mockReturnValue(false);

    render(<JsonViewer data={{ id: 1 }} showCopyButton={false} showFilters={false} />);

    expect(screen.getByTestId("json-editor")).toBeTruthy();
    expect(screen.queryByTestId("virtualized-json-viewer-inner")).toBeNull();
    expect(ff.isActive as Mock<any>).toHaveBeenCalledWith(ff.FF_FIT_2007_VIRTUALIZED_JSON_EDITOR);
  });

  it("renders virtualized inner when flag is on", () => {
    spyOn(ff, "isActive").mockReturnValue(true);

    render(<JsonViewer data={{ id: 1 }} showCopyButton={false} showFilters={false} />);

    expect(screen.getByTestId("virtualized-json-viewer-inner")).toBeTruthy();
    expect(screen.queryByTestId("json-editor")).toBeNull();
    expect(global.__virtualizedJsonViewerProps?.data).toEqual({ id: 1 });
  });

  it("preserves custom filter scope when flag is on", () => {
    spyOn(ff, "isActive").mockReturnValue(true);

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
    fireEvent.change(screen.getByLabelText("Search JSON"), { target: { value: "image" } });

    expect(global.__virtualizedJsonViewerProps?.activeFilterId).toBe("data");
    expect(global.__virtualizedJsonViewerProps?.searchText).toBe("image");
  });

  it("does not remount virtualized inner on filter change (avoids reparsing large JSON)", () => {
    spyOn(ff, "isActive").mockReturnValue(true);

    render(
      <JsonViewer
        data={{ id: 1, annotations: [{ id: 1 }], data: { text: "hi" } }}
        showCopyButton={false}
        customFilters={[
          {
            id: "annotations",
            label: "Annotations",
            filterFn: () => true,
          },
        ]}
      />,
    );

    expect(global.__virtualizedJsonViewerProps?.resetKey).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Annotations" }));
    expect(global.__virtualizedJsonViewerProps?.activeFilterId).toBe("annotations");
    expect(global.__virtualizedJsonViewerProps?.resetKey).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(global.__virtualizedJsonViewerProps?.activeFilterId).toBe("all");
    expect(global.__virtualizedJsonViewerProps?.resetKey).toBe(0);
  });

  it("remounts legacy inner on filter change", () => {
    spyOn(ff, "isActive").mockReturnValue(false);

    render(
      <JsonViewer
        data={{ id: 1, annotations: [{ id: 1 }] }}
        showCopyButton={false}
        customFilters={[
          {
            id: "annotations",
            label: "Annotations",
            filterFn: () => true,
          },
        ]}
      />,
    );

    expect(jsonEditReactModule.JsonEditor).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Annotations" }));

    expect(jsonEditReactModule.JsonEditor).toHaveBeenCalledTimes(2);
  });

  it("copy button still copies JSON.stringify(data, null, 2) when flag is on", async () => {
    spyOn(ff, "isActive").mockReturnValue(true);
    const writeText = mock(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });

    const data = { id: 1, label: "task" };
    render(<JsonViewer data={data} showSearch={false} showFilters={false} />);

    fireEvent.click(screen.getByRole("button"));

    expect(writeText).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
  });
});
