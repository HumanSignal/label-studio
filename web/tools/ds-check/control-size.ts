/**
 * The control size rules of `ds:check`. Controls from @humansignal/ui share one size scale
 * (`CONTROL_SIZES`): a row uses one size, and the height comes from the `size` prop alone.
 *   - controls that share a parent and pass different sizes;
 *   - a height forced on a control with a class, an inline style or one of its CSS variables.
 */
import { CONTROL_SIZE_NAMES, CONTROL_SIZES } from "../../libs/ui/src/ds-manifest/control-sizes";
import { type ExpressionItem, type JsxChild, type JsxElement, readJsxElements } from "./jsx";
import type { Finding } from "./types";

export const CONTROL_SIZE_RULE = "control-size";

/** Sized controls that sit in a row. TextArea is left out: its height comes from its rows. */
const ROW_CONTROLS = new Set([
  "Button",
  "DateRangePickerTrigger",
  "Input",
  "InputFile",
  "MultiTreeSelectDropdown",
  "NumberInput",
  "SearchInput",
  "SegmentedControl",
  "Select",
  "TagAutocomplete",
]);

/** The variables the controls size themselves with. Outside the design system nothing sets them. */
const HEIGHT_VARIABLES =
  /(--(?:select-trigger-height|multi-tree-trigger-height|field-height|segmented-height|search-height|tag-trigger-min-height|textarea-row-height))["']?\s*:/g;
const UI_IMPORT = /import\s+(?:type\s+)?(?:[\w$]+\s*,\s*)?\{([^}]*)\}\s*from\s*["']@humansignal\/ui["']/g;
const HEIGHT_CLASS = /(?:^|\s)!?(?:min-h|max-h|h)-[\w.[\]%-]+/;

const SIZE_WORDS = CONTROL_SIZE_NAMES.join(", ");
const mixedMessage = (sizes: string[]) =>
  `Controls in the same row use different sizes (${sizes.join(", ")}). ${CONTROL_SIZES.rule}`;
const HEIGHT_MESSAGE = `A height forced on a design-system control: the height comes from its size prop (${SIZE_WORDS}).`;
const VARIABLE_MESSAGE = `A design-system control's height variable set outside the design system: pass its size prop (${SIZE_WORDS}) instead.`;

const lineAt = (source: string, index: number) => source.slice(0, index).split("\n").length;

/** Local names of the row controls this file imports from @humansignal/ui. */
function importedControls(source: string): Set<string> {
  const names = new Set<string>();
  for (const [, bindings] of source.matchAll(UI_IMPORT)) {
    for (const binding of bindings.split(",")) {
      const [imported, local = imported] = binding
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/);
      if (ROW_CONTROLS.has(imported)) names.add(local);
    }
  }
  return names;
}

const attribute = (element: JsxElement, name: string) => element.attributes.find((attr) => attr.name === name);

/** The size a control renders at: the literal it passes, the default when it passes none, null when computed. */
function sizeOf(element: JsxElement): string | null {
  if (element.hasSpread) return null;
  const size = attribute(element, "size");
  if (!size) return CONTROL_SIZES.default;
  return size.literal ?? null;
}

export function controlSizeFindings(file: string, source: string): Finding[] {
  if (!/@humansignal\/ui/.test(source) || !/\.(?:[jt]sx|js)$/.test(file)) return [];
  const controls = importedControls(source);
  if (!controls.size) return [];
  const out: Finding[] = [];
  const isControl = (element: JsxElement) => element.kind !== "fragment" && controls.has(element.tag);

  /** Controls an expression contributes to a row: the control a condition or a pair of parentheses holds. */
  const expressionControls = (items: ExpressionItem[]): JsxElement[] => {
    const operator = (name: string, from = 0) =>
      items.findIndex((item, index) => index >= from && item.type === "operator" && item.operator === name);
    const comma = items.findLastIndex((item) => item.type === "operator" && item.operator === ",");
    if (comma !== -1) return expressionControls(items.slice(comma + 1));
    const question = operator("?");
    const arrow = operator("=>");
    if (arrow !== -1 && (question === -1 || arrow < question)) return [];
    if (question !== -1) {
      let depth = 0;
      for (let index = question + 1; index < items.length; index++) {
        const item = items[index];
        if (item.type !== "operator") continue;
        if (item.operator === "?") depth++;
        else if (item.operator === ":" && depth-- === 0) {
          return [
            ...expressionControls(items.slice(question + 1, index)),
            ...expressionControls(items.slice(index + 1)),
          ];
        }
      }
      return [];
    }
    const logical = items.findLastIndex(
      (item) =>
        item.type === "operator" && (item.operator === "&&" || item.operator === "||" || item.operator === "??"),
    );
    if (logical !== -1) return expressionControls(items.slice(logical + 1));
    if (items.length !== 1) return [];
    const [only] = items;
    if (only.type === "group") return expressionControls(only.items);
    return only.type === "jsx" ? elementControls(only.element) : [];
  };

  /** Controls an element contributes to its parent's row: itself, or the control a bare wrapper holds. */
  const elementControls = (element: JsxElement): JsxElement[] => {
    if (isControl(element)) return [element];
    // a wrapper that holds the control and nothing else, such as a div that gives a field its width
    if (element.kind !== "element" || element.children.length !== 1) return [];
    const [only] = element.children;
    if (only.kind === "text") return [];
    if (only.kind !== "expression") return isControl(only) ? [only] : [];
    const [item] = only.items;
    const holdsAnElement = only.items.length === 1 && item.type === "jsx" && item.element.kind === "element";
    return holdsAnElement ? [] : expressionControls(only.items);
  };

  const rowControls = (child: JsxChild): JsxElement[] => {
    if (child.kind === "text") return [];
    return child.kind === "expression" ? expressionControls(child.items) : elementControls(child);
  };

  for (const element of readJsxElements(source)) {
    if (element.kind !== "self-closing") {
      const sizes = new Set<string>();
      for (const control of element.children.flatMap(rowControls)) {
        const size = sizeOf(control);
        if (size) sizes.add(size);
      }
      if (sizes.size > 1) {
        out.push({
          file,
          line: lineAt(source, element.start),
          rule: CONTROL_SIZE_RULE,
          message: mixedMessage(CONTROL_SIZE_NAMES.filter((name) => sizes.has(name))),
        });
      }
    }
    if (isControl(element)) {
      const className = attribute(element, "className")?.literal;
      const style = attribute(element, "style")?.raw ?? "";
      if ((className && HEIGHT_CLASS.test(className)) || /\b(?:minHeight|maxHeight|height)\s*:/.test(style)) {
        out.push({ file, line: lineAt(source, element.start), rule: CONTROL_SIZE_RULE, message: HEIGHT_MESSAGE });
      }
    }
  }
  return out;
}

/** A control's height variable declared in app code, in a stylesheet or an inline style. */
export function heightVariableFindings(file: string, source: string): Finding[] {
  return [...source.matchAll(HEIGHT_VARIABLES)].map((match) => ({
    file,
    line: lineAt(source, match.index ?? 0),
    rule: CONTROL_SIZE_RULE,
    message: VARIABLE_MESSAGE,
  }));
}
