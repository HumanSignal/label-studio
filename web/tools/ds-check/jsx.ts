/**
 * A small JSX reader for the `ds:check` rules that need the element tree. It has no dependencies, because CI runs
 * the checks without installing packages. It reads what the rules ask for (tags, attributes, children and the
 * shape of the expressions between them) and skips the syntax it does not understand.
 */

export type JsxAttribute = {
  name: string;
  /** The value as written, with its quotes or braces. Undefined for a bare attribute. */
  raw?: string;
  /** The text, when the value is a string literal. */
  literal?: string;
};

export type JsxElement = {
  kind: "element" | "self-closing" | "fragment";
  tag: string;
  start: number;
  attributes: JsxAttribute[];
  hasSpread: boolean;
  children: JsxChild[];
};

/** Blank text between children is dropped. */
export type JsxChild = JsxElement | { kind: "text" } | { kind: "expression"; items: ExpressionItem[] };

/** The top level of an expression: enough to tell a condition from a call. */
export type ExpressionItem =
  | { type: "jsx"; element: JsxElement }
  | { type: "operator"; operator: "?" | ":" | "&&" | "||" | "??" | "=>" | "," }
  | { type: "group"; items: ExpressionItem[] }
  | { type: "other" };

const KEYWORDS_BEFORE_AN_EXPRESSION = new Set([
  "return",
  "typeof",
  "case",
  "do",
  "else",
  "in",
  "of",
  "void",
  "delete",
  "await",
  "yield",
  "new",
  "default",
  "instanceof",
]);
const CLOSERS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const WORD = /[\w$]+/y;
const TAG_NAME = /[A-Za-z_$][\w$]*(?:[.:-][\w$]+)*/y;
const ATTRIBUTE_NAME = /[A-Za-z_$][\w$:-]*/y;
const STRING_LITERAL = /^(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|`((?:\\.|[^`\\$])*)`)$/s;

class Unreadable extends Error {}

/** Every JSX element of a source file, in document order. */
export function readJsxElements(source: string): JsxElement[] {
  const elements: JsxElement[] = [];
  const length = source.length;

  const match = (pattern: RegExp, at: number) => {
    pattern.lastIndex = at;
    return pattern.exec(source)?.[0];
  };

  const skipSpace = (from: number) => {
    let i = from;
    while (i < length) {
      if (/\s/.test(source[i])) i++;
      else if (source.startsWith("//", i)) i = lineEnd(i);
      else if (source.startsWith("/*", i)) i = blockCommentEnd(i);
      else break;
    }
    return i;
  };
  const lineEnd = (from: number) => {
    const end = source.indexOf("\n", from);
    return end === -1 ? length : end;
  };
  const blockCommentEnd = (from: number) => {
    const end = source.indexOf("*/", from + 2);
    return end === -1 ? length : end + 2;
  };

  const quotedEnd = (from: number) => {
    const quote = source[from];
    let i = from + 1;
    while (i < length && source[i] !== quote && source[i] !== "\n") i += source[i] === "\\" ? 2 : 1;
    return Math.min(i + 1, length);
  };
  const templateEnd = (from: number) => {
    let i = from + 1;
    while (i < length && source[i] !== "`") {
      if (source[i] === "\\") i += 2;
      else if (source.startsWith("${", i)) i = readExpression(i + 2, "}").end + 1;
      else i++;
    }
    return Math.min(i + 1, length);
  };
  const regexEnd = (from: number) => {
    let i = from + 1;
    let inClass = false;
    while (i < length && source[i] !== "\n") {
      if (source[i] === "\\") i++;
      else if (source[i] === "[") inClass = true;
      else if (source[i] === "]") inClass = false;
      else if (source[i] === "/" && !inClass) return i + 1;
      i++;
    }
    throw new Unreadable();
  };

  /** Reads code up to `closer` (or the end of the file) and returns where the closer is. */
  function readExpression(from: number, closer?: string): { end: number; items: ExpressionItem[] } {
    const items: ExpressionItem[] = [];
    const other = () => {
      if (items.at(-1)?.type !== "other") items.push({ type: "other" });
    };
    // whether the code before the cursor is a value, which makes `<` a comparison and `/` a division
    let afterValue = false;
    let i = from;
    while (i < length) {
      i = skipSpace(i);
      if (i >= length) break;
      const char = source[i];
      if (char === closer) return { end: i, items };
      if (char === ")" || char === "]" || char === "}") {
        if (!closer) {
          i++;
          continue;
        }
        throw new Unreadable();
      }
      if (char === '"' || char === "'") {
        i = quotedEnd(i);
        other();
        afterValue = true;
      } else if (char === "`") {
        i = templateEnd(i);
        other();
        afterValue = true;
      } else if (char === "(" || char === "[" || char === "{") {
        const group = readExpression(i + 1, CLOSERS[char]);
        if (char === "(") items.push({ type: "group", items: group.items });
        else other();
        i = group.end + 1;
        afterValue = char !== "{";
      } else if (char === "<" && !afterValue && /[A-Za-z_$>]/.test(source[i + 1] ?? "")) {
        const element = tryElement(i);
        if (element) {
          items.push({ type: "jsx", element: element.element });
          i = element.end;
          afterValue = true;
        } else {
          other();
          i++;
        }
      } else if (char === "/" && !afterValue) {
        i = regexEnd(i);
        other();
        afterValue = true;
      } else if (source.startsWith("=>", i)) {
        items.push({ type: "operator", operator: "=>" });
        i += 2;
        afterValue = false;
      } else if (source.startsWith("&&", i) || source.startsWith("||", i) || source.startsWith("??", i)) {
        items.push({ type: "operator", operator: source.slice(i, i + 2) as "&&" | "||" | "??" });
        i += 2;
        afterValue = false;
      } else if (char === "?" && source[i + 1] === "." && !/\d/.test(source[i + 2] ?? "")) {
        other();
        i += 2;
        afterValue = false;
      } else if (char === "?" || char === ":" || char === ",") {
        items.push({ type: "operator", operator: char });
        i++;
        afterValue = false;
      } else {
        const word = match(WORD, i);
        other();
        i += word?.length ?? 1;
        afterValue = word !== undefined && !KEYWORDS_BEFORE_AN_EXPRESSION.has(word);
      }
    }
    if (closer) throw new Unreadable();
    return { end: length, items };
  }

  /** A `<` that does not open an element (a generic, a comparison) leaves the list as it was. */
  function tryElement(from: number): { element: JsxElement; end: number } | undefined {
    const known = elements.length;
    try {
      return readElement(from);
    } catch (error) {
      if (!(error instanceof Unreadable)) throw error;
      elements.length = known;
      return undefined;
    }
  }

  function readElement(from: number): { element: JsxElement; end: number } {
    const element: JsxElement = {
      kind: "element",
      tag: "",
      start: from,
      attributes: [],
      hasSpread: false,
      children: [],
    };
    elements.push(element);
    let i = from + 1;
    if (source[i] === ">") {
      element.kind = "fragment";
      return { element, end: readChildren(element, i + 1) };
    }
    const tag = match(TAG_NAME, i);
    if (!tag) throw new Unreadable();
    element.tag = tag;
    i += tag.length;
    if (source[i] === "<") i = typeArgumentsEnd(i);
    while (true) {
      i = skipSpace(i);
      if (source.startsWith("/>", i)) {
        element.kind = "self-closing";
        return { element, end: i + 2 };
      }
      if (source[i] === ">") return { element, end: readChildren(element, i + 1) };
      if (source[i] === "{") {
        element.hasSpread = true;
        i = readExpression(i + 1, "}").end + 1;
        continue;
      }
      const name = match(ATTRIBUTE_NAME, i);
      if (!name) throw new Unreadable();
      i = skipSpace(i + name.length);
      if (source[i] !== "=") {
        element.attributes.push({ name });
        continue;
      }
      const valueStart = skipSpace(i + 1);
      const first = source[valueStart];
      if (first === '"' || first === "'") {
        const close = source.indexOf(first, valueStart + 1);
        if (close === -1) throw new Unreadable();
        i = close + 1;
        element.attributes.push({
          name,
          raw: source.slice(valueStart, i),
          literal: source.slice(valueStart + 1, close),
        });
      } else if (first === "{") {
        i = readExpression(valueStart + 1, "}").end + 1;
        const raw = source.slice(valueStart, i);
        const literal = STRING_LITERAL.exec(raw.slice(1, -1).trim());
        element.attributes.push({ name, raw, literal: literal ? (literal[1] ?? literal[2] ?? literal[3]) : undefined });
      } else if (first === "<") {
        i = readElement(valueStart).end;
        element.attributes.push({ name, raw: source.slice(valueStart, i) });
      } else throw new Unreadable();
    }
  }

  const typeArgumentsEnd = (from: number) => {
    let depth = 0;
    for (let i = from; i < length; i++) {
      if (source[i] === "<") depth++;
      else if (source[i] === ">" && source[i - 1] !== "=" && --depth === 0) return i + 1;
    }
    throw new Unreadable();
  };

  /** Reads the children and the closing tag. Returns the index after the closing tag. */
  function readChildren(element: JsxElement, from: number): number {
    let i = from;
    while (i < length) {
      const next = source.slice(i).search(/[<{]/);
      if (next === -1) break;
      if (source.slice(i, i + next).trim() !== "") element.children.push({ kind: "text" });
      i += next;
      if (source[i] === "{") {
        const expression = readExpression(i + 1, "}");
        element.children.push({ kind: "expression", items: expression.items });
        i = expression.end + 1;
      } else if (source[i + 1] === "/") {
        const close = source.indexOf(">", i);
        if (close === -1 || source.slice(i + 2, close).trim() !== element.tag) throw new Unreadable();
        return close + 1;
      } else {
        const child = readElement(i);
        element.children.push(child.element);
        i = child.end;
      }
    }
    throw new Unreadable();
  }

  readExpression(0);
  return elements.sort((a, b) => a.start - b.start);
}
