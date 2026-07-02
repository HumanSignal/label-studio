import { act, render } from "@testing-library/react";
import tags from "@humansignal/core/lib/utils/schema/tags.json";
import { Annotation } from "@codemirror/state";
import { Cm6CodeEditor } from "./cm6-code-editor";

const PARENT_SYNC_DEBOUNCE_MS = 300;
const ExternalChange = Annotation.define<boolean>();

type Cm6EditorRef = {
  editor?: { setOption?: (key: string, value: unknown) => void };
  flushPendingChanges?: () => void;
  acknowledgeValue?: (value: string) => void;
};

let mockEditorDoc = "initial";
let mockHasFocus = true;
let mockOnChange: ((value: string) => void) | undefined;
let mockLastDispatchInsert: string | undefined;

mock.module("@uiw/react-codemirror", () => {
  const React = require("react");
  const MockCodeMirror = React.forwardRef(
    (
      {
        extensions,
        onChange,
        onCreateEditor,
        value,
      }: {
        extensions?: unknown[];
        onChange?: (value: string) => void;
        onCreateEditor?: (view: unknown, state: unknown) => void;
        value?: string;
      },
      ref: unknown,
    ) => {
      mockOnChange = onChange;

      const view = {
        hasFocus: mockHasFocus,
        state: {
          doc: {
            lines: 1,
            length: mockEditorDoc.length,
            line: () => ({ number: 1, length: mockEditorDoc.length }),
            toString: () => mockEditorDoc,
          },
        },
        dispatch: (update: { changes?: { insert?: string } }) => {
          if (typeof update.changes?.insert === "string") {
            mockEditorDoc = update.changes.insert;
            mockLastDispatchInsert = update.changes.insert;
          }
        },
        dom: document.createElement("div"),
        requestMeasure: () => {},
      };

      React.useImperativeHandle(ref, () => ({ view }));

      React.useEffect(() => {
        onCreateEditor?.(view, view.state);
      }, [onCreateEditor]);

      return React.createElement("div", {
        "data-testid": "mock-cm6",
        "data-value": value ?? "",
        "data-extensions-count": String(extensions?.length ?? 0),
      });
    },
  );

  return { default: MockCodeMirror, ExternalChange };
});

describe("Cm6CodeEditor", () => {
  beforeEach(() => {
    mockEditorDoc = "initial";
    mockHasFocus = true;
    mockOnChange = undefined;
    mockLastDispatchInsert = undefined;
  });

  it("calls onBeforeChange with updated value after debounce", async () => {
    const onBeforeChange = mock();

    render(
      <Cm6CodeEditor
        controlled
        value="initial"
        onBeforeChange={onBeforeChange}
        options={{ mode: { name: "javascript", json: true } }}
      />,
    );

    await act(async () => {
      mockEditorDoc = "changed-value";
      mockOnChange?.("changed-value");
      await new Promise((resolve) => setTimeout(resolve, PARENT_SYNC_DEBOUNCE_MS + 50));
    });

    expect(onBeforeChange).toHaveBeenCalledWith(expect.anything(), expect.anything(), "changed-value");
  });

  it("ignores CM5 extensions strings so CM6 does not receive hint addons", async () => {
    const onBeforeChange = mock();

    render(
      <Cm6CodeEditor
        controlled
        value="<View></View>"
        extensions={["hint", "xml-hint"]}
        onBeforeChange={onBeforeChange}
        options={{ mode: "xml", lineNumbers: true }}
      />,
    );

    await act(async () => {
      mockEditorDoc = "changed-value";
      mockOnChange?.("changed-value");
      await new Promise((resolve) => setTimeout(resolve, PARENT_SYNC_DEBOUNCE_MS + 50));
    });

    expect(onBeforeChange).toHaveBeenCalled();
  });

  it("keeps the same editor shim across keystrokes so setOption state is preserved", async () => {
    const ref = { current: null as Cm6EditorRef | null };

    render(
      <Cm6CodeEditor controlled ref={ref} value="initial" options={{ mode: { name: "javascript", json: true } }} />,
    );

    const editorBefore = ref.current?.editor;
    expect(editorBefore).toBeTruthy();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, PARENT_SYNC_DEBOUNCE_MS + 50));
    });

    expect(ref.current?.editor).toBe(editorBefore);
  });

  it("acknowledgeValue prevents duplicate parent emit when value prop catches up", async () => {
    const onBeforeChange = mock();
    const ref = { current: null as Cm6EditorRef | null };

    const { rerender } = render(
      <Cm6CodeEditor
        controlled
        ref={ref}
        value="initial"
        onBeforeChange={onBeforeChange}
        options={{ mode: { name: "javascript", json: true } }}
      />,
    );

    await act(async () => {
      mockEditorDoc = "changed-value";
      mockOnChange?.("changed-value");
      await new Promise((resolve) => setTimeout(resolve, PARENT_SYNC_DEBOUNCE_MS + 50));
    });

    expect(onBeforeChange).toHaveBeenCalledWith(expect.anything(), expect.anything(), "changed-value");

    ref.current?.acknowledgeValue?.("changed-value");

    rerender(
      <Cm6CodeEditor
        controlled
        ref={ref}
        value="changed-value"
        onBeforeChange={onBeforeChange}
        options={{ mode: { name: "javascript", json: true } }}
      />,
    );

    const callCountAfterAck = onBeforeChange.mock.calls.length;

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, PARENT_SYNC_DEBOUNCE_MS + 50));
    });

    expect(onBeforeChange).toHaveBeenCalledTimes(callCountAfterAck);
  });

  it("clears readOnly after options.readOnly flips from true to false", async () => {
    const { rerender } = render(
      <Cm6CodeEditor controlled value="hello" options={{ mode: { name: "javascript", json: true }, readOnly: true }} />,
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    rerender(
      <Cm6CodeEditor
        controlled
        value="hello"
        options={{ mode: { name: "javascript", json: true }, readOnly: false }}
      />,
    );

    await act(async () => {
      mockEditorDoc = "hello!";
      mockOnChange?.("hello!");
      await new Promise((resolve) => setTimeout(resolve, PARENT_SYNC_DEBOUNCE_MS + 50));
    });

    expect(mockEditorDoc).toBe("hello!");
  });

  it("does not revert editor when parent pushes stale value after user typed ahead", async () => {
    const { rerender } = render(
      <Cm6CodeEditor controlled value="hello" options={{ mode: "xml", hintOptions: { schemaInfo: tags } }} />,
    );

    await act(async () => {
      mockEditorDoc = "hello world";
      mockOnChange?.("hello world");
      await new Promise((resolve) => setTimeout(resolve, PARENT_SYNC_DEBOUNCE_MS + 50));
    });

    await act(async () => {
      rerender(
        <Cm6CodeEditor controlled value="hello world" options={{ mode: "xml", hintOptions: { schemaInfo: tags } }} />,
      );
    });

    await act(async () => {
      mockEditorDoc = "hello world!";
      mockOnChange?.("hello world!");
    });

    mockLastDispatchInsert = undefined;

    await act(async () => {
      rerender(
        <Cm6CodeEditor controlled value="hello world" options={{ mode: "xml", hintOptions: { schemaInfo: tags } }} />,
      );
    });

    expect(mockEditorDoc).toBe("hello world!");
    expect(mockLastDispatchInsert).toBeUndefined();
  });

  it("does not revert while editor is ahead of last emitted value", async () => {
    const { rerender } = render(
      <Cm6CodeEditor
        controlled
        value="hello world i say!"
        options={{ mode: "xml", hintOptions: { schemaInfo: tags } }}
      />,
    );

    await act(async () => {
      mockEditorDoc = "hello world i sa!";
      mockOnChange?.("hello world i sa!");
    });

    mockLastDispatchInsert = undefined;

    await act(async () => {
      rerender(
        <Cm6CodeEditor
          controlled
          value="hello world i say!"
          options={{ mode: "xml", hintOptions: { schemaInfo: tags } }}
        />,
      );
    });

    expect(mockEditorDoc).toBe("hello world i sa!");
    expect(mockLastDispatchInsert).toBeUndefined();
  });

  it("keeps editor value in sync with live document content for uiw prop latch", async () => {
    const { getByTestId } = render(
      <Cm6CodeEditor controlled value="hello" options={{ mode: { name: "javascript", json: true } }} />,
    );

    await act(async () => {
      mockEditorDoc = "hello world";
      mockOnChange?.("hello world");
    });

    expect(getByTestId("mock-cm6").getAttribute("data-value")).toBe("hello world");
  });

  it("rebuilds extensions when hintOptions schema loads after mount", () => {
    const { getByTestId, rerender } = render(
      <Cm6CodeEditor controlled value="<View></View>" options={{ mode: "xml" }} />,
    );

    const countWithoutSchema = Number(getByTestId("mock-cm6").getAttribute("data-extensions-count"));

    rerender(
      <Cm6CodeEditor controlled value="<View></View>" options={{ mode: "xml", hintOptions: { schemaInfo: tags } }} />,
    );

    const countWithSchema = Number(getByTestId("mock-cm6").getAttribute("data-extensions-count"));
    expect(countWithSchema).toBeGreaterThan(countWithoutSchema);
  });

  it("clears large-document mode when schema loads for a large XML config", () => {
    const largeXml = `<View>${"x".repeat(100_001)}</View>`;
    const { container, rerender } = render(<Cm6CodeEditor controlled value={largeXml} options={{ mode: "xml" }} />);

    expect(container.querySelector("[data-testid='cm6-code-editor']")).toHaveAttribute("data-large-document", "true");

    rerender(
      <Cm6CodeEditor controlled value={largeXml} options={{ mode: "xml", hintOptions: { schemaInfo: tags } }} />,
    );

    expect(container.querySelector("[data-testid='cm6-code-editor']")).not.toHaveAttribute("data-large-document");
  });

  it("keeps schema autocomplete enabled for large labeling interface configs", () => {
    const largeXml = `<View>${"x".repeat(100_001)}</View>`;
    const { container } = render(
      <Cm6CodeEditor controlled value={largeXml} options={{ mode: "xml", hintOptions: { schemaInfo: tags } }} />,
    );

    expect(container.querySelector("[data-testid='cm6-code-editor']")).not.toHaveAttribute("data-large-document");
  });

  it("marks large JSON documents without schema as lightweight", () => {
    const largeJson = "x".repeat(100_001);
    const { container } = render(
      <Cm6CodeEditor controlled value={largeJson} options={{ mode: { name: "javascript", json: true } }} />,
    );

    expect(container.querySelector("[data-testid='cm6-code-editor']")).toHaveAttribute("data-large-document", "true");
  });
});
