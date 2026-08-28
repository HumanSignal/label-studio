import tags from "@humansignal/core/lib/utils/schema/tags.json";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { undo, undoDepth } from "@codemirror/commands";
import { buildCm6Extensions, createPlaceholderContent } from "./cm5-compat-shim";

describe("buildCm6Extensions XML parity", () => {
  it("includes syntax highlighting and search keymap for all modes", () => {
    const extensions = buildCm6Extensions({ mode: "javascript", lineNumbers: true });
    expect(extensions.length).toBeGreaterThan(3);
  });

  it("builds xml language with schema autocomplete extensions", () => {
    const extensions = buildCm6Extensions(
      {
        mode: "xml",
        lineNumbers: true,
        hintOptions: { schemaInfo: tags },
      },
      { autoCloseTags: true },
    );

    // theme + highlight + xml language + autocomplete UI + trigger keymap + completion keymap + search + lineNumbers + compartments
    expect(extensions.length).toBeGreaterThanOrEqual(8);
  });

  it("builds lightweight xml extensions for large documents", () => {
    const largeExtensions = buildCm6Extensions(
      { mode: "xml", lineNumbers: true, hintOptions: { schemaInfo: tags } },
      { autoCloseTags: true, lightweight: true },
    );
    const fullExtensions = buildCm6Extensions(
      { mode: "xml", lineNumbers: true, hintOptions: { schemaInfo: tags } },
      { autoCloseTags: true, lightweight: false },
    );

    expect(largeExtensions.length).toBeLessThan(fullExtensions.length);
  });
});

describe("createPlaceholderContent", () => {
  it("keeps single-line placeholders as plain text", () => {
    expect(createPlaceholderContent("Insert Plugin")).toBe("Insert Plugin");
  });

  it("renders multi-line placeholders out of flow with the full text", () => {
    const text = "// line one\n// line two\n// line three";
    const content = createPlaceholderContent(text);

    expect(content).toBeInstanceOf(HTMLElement);
    const element = content as HTMLElement;
    expect(element.textContent).toBe(text);
    expect(element.style.position).toBe("absolute");
    expect(element.style.whiteSpace).toBe("pre-wrap");
  });
});

describe("buildCm6Extensions multi-line placeholder", () => {
  it("does not stretch the empty line box with a multi-line placeholder", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: "",
        extensions: buildCm6Extensions({
          mode: "javascript",
          lineWrapping: true,
          placeholder: "// first line\n// second line\n// third line",
        }),
      }),
    });

    try {
      const placeholderEl = view.dom.querySelector(".cm-placeholder");
      expect(placeholderEl).not.toBeNull();

      // An in-flow text node with newlines is what inflates the line box (and the caret).
      expect(placeholderEl?.firstChild?.nodeType).toBe(Node.ELEMENT_NODE);
      expect((placeholderEl?.firstElementChild as HTMLElement)?.style.position).toBe("absolute");
    } finally {
      view.destroy();
      parent.remove();
    }
  });
});

describe("buildCm6Extensions undo history", () => {
  it("records multiple user edits for undo/redo", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: "line one\nline two",
        extensions: buildCm6Extensions({ mode: "python", lineNumbers: true }),
      }),
    });

    try {
      expect(undoDepth(view.state)).toBe(0);

      view.dispatch({
        changes: { from: 0, insert: "# " },
      });
      view.dispatch({
        changes: { from: view.state.doc.length, insert: "\nline three" },
      });
      expect(undoDepth(view.state)).toBeGreaterThanOrEqual(2);

      undo(view);
      expect(view.state.doc.toString()).toBe("# line one\nline two");

      undo(view);
      expect(view.state.doc.toString()).toBe("line one\nline two");
    } finally {
      view.destroy();
      parent.remove();
    }
  });
});
