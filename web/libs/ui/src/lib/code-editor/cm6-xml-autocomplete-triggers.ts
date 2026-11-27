import { autocompletion, completionKeymap, startCompletion } from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import { Prec, type EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";

function isInsideOpenTag(state: EditorState, pos: number): boolean {
  const at = syntaxTree(state).resolveInner(pos, -1);

  for (let cur = at; cur; cur = cur.parent) {
    if (cur.name === "OpenTag" || cur.name === "SelfClosingTag") {
      return true;
    }
    if (cur.name === "Attribute" || cur.name === "AttributeName" || cur.name === "AttributeValue") {
      return true;
    }
  }

  return false;
}

function isInIncompleteAttributeString(state: EditorState, pos: number): boolean {
  const at = syntaxTree(state).resolveInner(pos, -1);
  if (at.name !== "AttributeValue" && at.name !== "String") return false;

  const text = state.doc.sliceString(at.from, pos);
  if (!text) return false;

  const quote = text.charAt(0);
  if (quote !== '"' && quote !== "'") return false;

  return text.length === 1 || !text.endsWith(quote);
}

/** CM5 completeAfter / completeIfInTag parity for Labeling Interface XML editing. */
const xmlAutocompleteTriggerKeymap = Prec.highest(
  keymap.of([
    {
      key: "<",
      run(view) {
        setTimeout(() => startCompletion(view), 100);
        return false;
      },
    },
    {
      key: " ",
      run(view) {
        const pos = view.state.selection.main.head;
        if (!isInsideOpenTag(view.state, pos)) return false;
        if (isInIncompleteAttributeString(view.state, pos)) return false;
        setTimeout(() => startCompletion(view), 100);
        return false;
      },
    },
    {
      key: "=",
      run(view) {
        const pos = view.state.selection.main.head;
        if (!isInsideOpenTag(view.state, pos)) return false;
        setTimeout(() => startCompletion(view), 100);
        return false;
      },
    },
  ]),
);

/** Autocomplete UI + CM5 trigger keys; schema sources come from xml() language data. */
export function buildXmlAutocompleteExtensions() {
  return [
    autocompletion({
      activateOnTyping: false,
      closeOnBlur: true,
      maxRenderedOptions: 200,
    }),
    xmlAutocompleteTriggerKeymap,
    keymap.of(completionKeymap),
  ];
}
