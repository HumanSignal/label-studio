import tags from "@humansignal/core/lib/utils/schema/tags.json";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { undo, undoDepth } from "@codemirror/commands";
import { buildCm6Extensions } from "./cm5-compat-shim";

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
