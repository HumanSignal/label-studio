import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { python } from "@codemirror/lang-python";
import { xml } from "@codemirror/lang-xml";
import { indentUnit } from "@codemirror/language";
import { searchKeymap } from "@codemirror/search";
import { history, historyKeymap } from "@codemirror/commands";
import { Compartment, EditorState, type Extension, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, keymap, lineNumbers, placeholder } from "@codemirror/view";
import type { Editor } from "codemirror";
import { labelStudioSyntaxHighlighting } from "./cm6-code-editor-highlight";
import { labelStudioCm6Theme } from "./cm6-code-editor-theme";
import { buildXmlAutocompleteExtensions } from "./cm6-xml-autocomplete-triggers";
import {
  getCachedLabelingTagsXmlConfig,
  isLabelingTagsSchema,
  schemaInfoToXmlConfig,
  type SchemaInfo,
} from "./schema-info-to-xml-config";

export type Cm5ModeOption =
  | string
  | {
      name: string;
      json?: boolean;
    };

export type Cm5HintOptions = {
  schemaInfo?: SchemaInfo;
  quoteChar?: string;
  matchInMiddle?: boolean;
};

export type Cm5EditorOptions = {
  mode?: Cm5ModeOption;
  theme?: string;
  lineNumbers?: boolean;
  lineWrapping?: boolean;
  readOnly?: boolean | "nocursor";
  tabSize?: number;
  placeholder?: string;
  hintOptions?: Cm5HintOptions;
  autoCloseTags?: boolean;
  smartIndent?: boolean;
};

export type Cm5ChangeOrigin = "+" | "set" | "paste" | "undo" | "redo";

export type Cm5ChangeData = {
  origin: Cm5ChangeOrigin;
  from: { line: number; ch: number };
  to: { line: number; ch: number };
  text: string[];
};

type Cm5TextMarker = {
  clear: () => void;
};

type MarkRange = { from: number; to: number; className: string };

const addMarkEffect = StateEffect.define<MarkRange>();
const removeMarkEffect = StateEffect.define<{ from: number; to: number }>();

const markField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, transaction) {
    let next = decorations.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (effect.is(addMarkEffect)) {
        const mark = Decoration.mark({ class: effect.value.className });
        next = next.update({
          add: [mark.range(effect.value.from, effect.value.to)],
        });
      } else if (effect.is(removeMarkEffect)) {
        next = next.update({
          filter: (from, to) => !(from === effect.value.from && to === effect.value.to),
        });
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const placeholderCompartment = new Compartment();
const readOnlyCompartment = new Compartment();

export type Cm5EditorShim = Pick<
  Editor,
  | "getValue"
  | "setValue"
  | "setOption"
  | "scrollIntoView"
  | "refresh"
  | "getWrapperElement"
  | "posFromIndex"
  | "markText"
>;

type ResolveLanguageOptions = {
  hintOptions?: Cm5HintOptions;
  autoCloseTags?: boolean;
  lightweight?: boolean;
};

function resolveXmlExtension(hintOptions?: Cm5HintOptions, autoCloseTags = true, lightweight = false): Extension {
  if (lightweight) {
    return xml({ autoCloseTags });
  }

  const schemaInfo = hintOptions?.schemaInfo;
  const schemaConfig = schemaInfo
    ? isLabelingTagsSchema(schemaInfo)
      ? getCachedLabelingTagsXmlConfig()
      : schemaInfoToXmlConfig(schemaInfo)
    : {};

  return xml({
    ...schemaConfig,
    autoCloseTags,
  });
}

export function resolveLanguageExtension(
  mode?: Cm5ModeOption,
  languageOptions: ResolveLanguageOptions = {},
): Extension | null {
  const { hintOptions, autoCloseTags = true, lightweight = false } = languageOptions;

  if (!mode) {
    return null;
  }

  if (typeof mode === "string") {
    switch (mode) {
      case "xml":
        return resolveXmlExtension(hintOptions, autoCloseTags, lightweight);
      case "javascript":
        return javascript();
      case "python":
        return python();
      case "json":
        return json();
      default:
        return javascript();
    }
  }

  if (mode.name === "javascript" && mode.json) {
    return json();
  }

  if (mode.name === "javascript") {
    return javascript();
  }

  if (mode.name === "xml") {
    return resolveXmlExtension(hintOptions, autoCloseTags, lightweight);
  }

  if (mode.name === "python") {
    return python();
  }

  return javascript();
}

function isXmlMode(mode?: Cm5ModeOption): boolean {
  if (!mode) return false;
  if (typeof mode === "string") return mode === "xml";
  return mode.name === "xml";
}

function resolveReadOnlyExtension(readOnly?: boolean | "nocursor"): Extension {
  if (!readOnly) {
    return [];
  }

  if (readOnly === "nocursor") {
    return [EditorState.readOnly.of(true), EditorView.editable.of(false)];
  }

  return EditorState.readOnly.of(true);
}

function offsetToCm5Pos(doc: EditorState["doc"], offset: number): { line: number; ch: number } {
  const line = doc.lineAt(offset);
  return { line: line.number - 1, ch: offset - line.from };
}

export function createCm5EditorShim(getView: () => EditorView | undefined | null): Cm5EditorShim {
  const dynamicOptions: Cm5EditorOptions = {};

  return {
    getValue() {
      return getView()?.state.doc.toString() ?? "";
    },

    setValue(value: string) {
      const view = getView();
      if (!view) return;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    },

    setOption(key: string, value: unknown) {
      const view = getView();
      if (!view) return;

      if (key === "placeholder") {
        dynamicOptions.placeholder = typeof value === "string" ? value : undefined;
        view.dispatch({
          effects: placeholderCompartment.reconfigure(
            dynamicOptions.placeholder ? placeholder(dynamicOptions.placeholder) : [],
          ),
        });
        return;
      }

      if (key === "readOnly") {
        dynamicOptions.readOnly = value as Cm5EditorOptions["readOnly"];
        view.dispatch({
          effects: readOnlyCompartment.reconfigure(resolveReadOnlyExtension(dynamicOptions.readOnly)),
        });
      }
    },

    scrollIntoView(pos: { line: number; ch?: number }) {
      const view = getView();
      if (!view) return;
      const line = view.state.doc.line(pos.line + 1);
      const offset = line.from + (pos.ch ?? 0);
      view.dispatch({
        effects: EditorView.scrollIntoView(offset, { y: "center" }),
      });
    },

    refresh() {
      const view = getView();
      if (!view) return;
      view.requestMeasure();
    },

    getWrapperElement() {
      return getView()?.dom ?? document.createElement("div");
    },

    posFromIndex(index: number) {
      const view = getView();
      if (!view) return { line: 0, ch: 0 };
      return offsetToCm5Pos(view.state.doc, index);
    },

    markText(
      from: { line: number; ch: number },
      to: { line: number; ch: number },
      options: { className?: string },
    ): Cm5TextMarker {
      const view = getView();
      if (!view) {
        return { clear: () => {} };
      }

      const fromLine = view.state.doc.line(from.line + 1);
      const toLine = view.state.doc.line(to.line + 1);
      const fromOffset = fromLine.from + from.ch;
      const toOffset = toLine.from + to.ch;
      const className = options.className ?? "";

      view.dispatch({
        effects: addMarkEffect.of({ from: fromOffset, to: toOffset, className }),
      });

      return {
        clear: () => {
          view.dispatch({
            effects: removeMarkEffect.of({ from: fromOffset, to: toOffset }),
          });
        },
      };
    },
  };
}

export function buildCm6Extensions(
  options: Cm5EditorOptions = {},
  handlers?: {
    autoCloseTags?: boolean;
    lightweight?: boolean;
    onKeyDown?: (editor: Cm5EditorShim, event: KeyboardEvent) => void;
  },
): Extension[] {
  const lightweight = handlers?.lightweight === true;
  const extensions: Extension[] = [markField, labelStudioCm6Theme, labelStudioSyntaxHighlighting];

  const language = resolveLanguageExtension(options.mode, {
    hintOptions: options.hintOptions,
    autoCloseTags: handlers?.autoCloseTags !== false,
    lightweight,
  });
  if (language) {
    extensions.push(language);
  }

  if (!lightweight && isXmlMode(options.mode) && options.hintOptions?.schemaInfo) {
    extensions.push(...buildXmlAutocompleteExtensions());
  }

  // CM5 extraKeys: Ctrl-F / Cmd-F → findPersistent
  extensions.push(keymap.of(searchKeymap));
  extensions.push(history());
  extensions.push(keymap.of(historyKeymap));

  if (options.lineNumbers) {
    extensions.push(lineNumbers());
  }

  if (options.lineWrapping) {
    extensions.push(EditorView.lineWrapping);
  }

  if (options.tabSize) {
    extensions.push(indentUnit.of(" ".repeat(options.tabSize)));
  }

  extensions.push(
    placeholderCompartment.of(options.placeholder ? placeholder(options.placeholder) : []),
    readOnlyCompartment.of(resolveReadOnlyExtension(options.readOnly)),
  );

  if (handlers?.onKeyDown) {
    extensions.push(
      EditorView.domEventHandlers({
        keydown(event, view) {
          handlers.onKeyDown?.(
            createCm5EditorShim(() => view),
            event,
          );
          return false;
        },
      }),
    );
  }

  return extensions;
}

export function buildCm5ChangeData(view: EditorView, newValue: string): Cm5ChangeData {
  const doc = view.state.doc;
  const lastLine = doc.line(doc.lines);
  return {
    origin: "+",
    from: { line: 0, ch: 0 },
    to: { line: lastLine.number - 1, ch: lastLine.length },
    text: newValue.split("\n"),
  };
}
