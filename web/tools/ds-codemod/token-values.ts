/**
 * Rewrites values that already equal a design token into the token itself, so the rendered result does not change.
 * The patterns mirror the ds:check rules (tailwind-primitive, color-literal) they fix.
 */
import ts from "typescript";

export type Rewrite = { source: string; count: number };

// The default Tailwind scale and the spacing tokens resolve to the same rem values.
const SPACING_TOKENS: Record<string, string> = {
  "0.5": "tightest",
  "1": "tighter",
  "2": "tight",
  "4": "base",
  "6": "wide",
  "8": "wider",
  "10": "widest",
};
const SPACING_UTILITIES = "gap-x|gap-y|gap|space-x|space-y|px|py|pt|pr|pb|pl|ps|pe|p|mx|my|mt|mr|mb|ml|ms|me|m";
// Matched against the utility of one class, after its variants (`md:hover:`), so bracket values stay untouched.
const SPACING_UTILITY = new RegExp(`^(!?-?(?:${SPACING_UTILITIES})-)(0\\.5|10|1|2|4|6|8)$`);
const ANY_SPACING_UTILITY = new RegExp(`^(!?-?(?:${SPACING_UTILITIES})-)\\S+$`);

// Where a string holds Tailwind classes: names ending in class / className / classes (attributes, properties,
// variables, parameters, functions that return classes), and these class helpers.
const CLASS_NAME = /class(?:names?|es)?$/i;
const CLASS_HELPERS = new Set(["cn", "cnm", "clsx", "cx", "scn", "cva", "classNames", "twMerge", "twJoin"]);
// Helpers whose object arguments map class names (keys) to conditions (values).
const CLASS_MAP_HELPERS = new Set(["cn", "cnm", "clsx", "cx", "scn", "classNames"]);
// Helpers that resolve conflicting utilities (tailwind-merge); every other join leaves both classes in the DOM.
const MERGING_HELPERS = new Set(["cnm", "twMerge", "cva"]);
// Operators whose operands are compared or tested, never rendered as classes.
const TEST_OPERATORS = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
  ts.SyntaxKind.InKeyword,
  ts.SyntaxKind.InstanceOfKeyword,
]);

// gluedStart / gluedEnd: the text touches a `${…}` substitution there, so its first / last class is incomplete.
// depth: how many `[` brackets are open where the text starts; what sits inside them is an arbitrary value.
type Range = { start: number; end: number; gluedStart?: boolean; gluedEnd?: boolean; depth?: number };

function scriptKind(fileName: string): ts.ScriptKind {
  return fileName.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.TSX;
}

function nameOf(node: ts.Node): string | undefined {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isPrivateIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isJsxNamespacedName(node)) return node.name.text;
  return undefined;
}

const isStatement = (node: ts.Node) =>
  node.kind >= ts.SyntaxKind.FirstStatement && node.kind <= ts.SyntaxKind.LastStatement;

const isClassName = (node: ts.Node | undefined) => !!node && CLASS_NAME.test(nameOf(node) ?? "");

/** The name a function is declared or assigned under. */
function functionName(fn: ts.Node): ts.Node | undefined {
  if ((ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn) || ts.isFunctionExpression(fn)) && fn.name) {
    return fn.name;
  }
  const holder = fn.parent;
  if (ts.isVariableDeclaration(holder) || ts.isPropertyAssignment(holder)) return holder.name;
  return undefined;
}

/** True when `child` passes through `parent` as a value (parentheses, arrays, spreads, type assertions, `a && child`). */
function passesThrough(parent: ts.Node, child: ts.Node): boolean {
  if (ts.isParenthesizedExpression(parent) || ts.isArrayLiteralExpression(parent)) return true;
  if (ts.isAsExpression(parent) || ts.isSatisfiesExpression(parent) || ts.isTypeAssertionExpression(parent)) {
    return parent.expression === child;
  }
  if (ts.isNonNullExpression(parent) || ts.isSpreadAssignment(parent) || ts.isSpreadElement(parent)) return true;
  if (ts.isObjectLiteralExpression(parent)) return ts.isSpreadAssignment(child);
  if (ts.isConditionalExpression(parent)) return parent.condition !== child;
  if (ts.isBinaryExpression(parent)) {
    const operator = parent.operatorToken.kind;
    if (operator === ts.SyntaxKind.AmpersandAmpersandToken) return parent.right === child;
    return operator === ts.SyntaxKind.BarBarToken || operator === ts.SyntaxKind.QuestionQuestionToken;
  }
  return false;
}

/** True when the object literal is a class map argument of cn / clsx / classNames, directly or through wrappers. */
function isClassMap(object: ts.Node): boolean {
  if (!ts.isObjectLiteralExpression(object)) return false;
  let child: ts.Node = object;
  let parent = object.parent;
  while (parent && passesThrough(parent, child)) {
    child = parent;
    parent = parent.parent;
  }
  return !!parent && ts.isCallExpression(parent) && CLASS_MAP_HELPERS.has(nameOf(parent.expression) ?? "");
}

/** `[` minus `]` in `text`, starting from `depth`. */
function bracketDepth(text: string, depth = 0): number {
  let out = depth;
  for (const char of text) {
    if (char === "[") out += 1;
    else if (char === "]") out = Math.max(0, out - 1);
  }
  return out;
}

/** The template text before substitution `index`: its head and the chunks between the earlier substitutions. */
function textBefore(template: ts.TemplateExpression, index: number): string[] {
  return [template.head.text, ...template.templateSpans.slice(0, index).map((span) => span.literal.text)];
}

/**
 * How a node inside `${…}` meets the text of every enclosing template: glued to the text (or to another
 * substitution) before or after it, and how many `[` brackets are open around it. `atStart` / `atEnd`: the node
 * starts / ends the value it belongs to, so the glue of the outer template reaches it.
 */
function templateContext(
  node: ts.Node,
  atStart = true,
  atEnd = true,
): Pick<Range, "gluedStart" | "gluedEnd" | "depth"> {
  const out = { gluedStart: false, gluedEnd: false, depth: 0 };
  let current = node;
  for (;;) {
    const span = ts.findAncestor(current.parent, (n) => ts.isTemplateSpan(n) || isStatement(n) || ts.isFunctionLike(n));
    if (!span || !ts.isTemplateSpan(span) || !ts.isTemplateExpression(span.parent)) return out;
    const template = span.parent;
    const index = template.templateSpans.indexOf(span);
    const chunks = textBefore(template, index);
    const before = chunks[chunks.length - 1];
    const after = span.literal.text;
    out.depth += chunks.reduce((depth, chunk) => bracketDepth(chunk, depth), 0);
    out.gluedStart ||= atStart && (/\S$/.test(before) || (index > 0 && before === ""));
    out.gluedEnd ||= atEnd && (/^\S/.test(after) || (index < template.templateSpans.length - 1 && after === ""));
    atStart &&= chunks.every((chunk) => chunk === "");
    atEnd &&= template.templateSpans.slice(index).every((rest) => rest.literal.text === "");
    current = template;
  }
}

/** True when `child` is a slot of `parent` that is tested, compared or looked up rather than rendered as classes. */
function isNonClassSlot(parent: ts.Node, child: ts.Node): boolean {
  if (ts.isTypeNode(parent)) return true;
  if (ts.isConditionalExpression(parent)) return parent.condition === child;
  if (ts.isElementAccessExpression(parent)) return parent.argumentExpression === child;
  if (ts.isBinaryExpression(parent)) {
    const operator = parent.operatorToken.kind;
    return (
      TEST_OPERATORS.has(operator) || (operator === ts.SyntaxKind.AmpersandAmpersandToken && parent.left === child)
    );
  }
  if (ts.isPropertyAssignment(parent)) {
    // cva selectors name variants, they are not classes.
    if (parent.initializer === child && /^(?:defaultVariants|compoundVariants)$/.test(nameOf(parent.name) ?? "")) {
      return true;
    }
    // A class map's keys are classes and its values are conditions; any other object's keys are lookup keys.
    return isClassMap(parent.parent) ? parent.initializer === child : parent.name === child;
  }
  return false;
}

/** True when the string sits in a class value (className="…", fooClassName: "…", BAR_CLASS = "…", cn(…), cva(…)). */
function inClassContext(node: ts.Node): boolean {
  let child = node;
  for (let parent = node.parent; parent; child = parent, parent = parent.parent) {
    if (ts.isJsxAttribute(parent)) return isClassName(parent.name);
    if (ts.isPropertyAssignment(parent) && parent.name === child && isClassMap(parent.parent)) return true;
    if (
      ts.isPropertyAssignment(parent) &&
      parent.initializer === child &&
      isClassName(parent.name) &&
      !isClassMap(parent.parent)
    ) {
      return true;
    }
    if (isNonClassSlot(parent, child)) return false;
    if (ts.isVariableDeclaration(parent)) return parent.initializer === child && isClassName(parent.name);
    if (ts.isParameter(parent) || ts.isBindingElement(parent)) {
      const names = ts.isBindingElement(parent) ? [parent.name, parent.propertyName] : [parent.name];
      return parent.initializer === child && names.some(isClassName);
    }
    if (ts.isCallExpression(parent) || ts.isTaggedTemplateExpression(parent)) {
      const callee = ts.isCallExpression(parent) ? parent.expression : parent.tag;
      return CLASS_HELPERS.has(nameOf(callee) ?? "");
    }
    if (ts.isReturnStatement(parent) || (ts.isArrowFunction(parent) && parent.body === child)) {
      const fn = ts.isArrowFunction(parent) ? parent : ts.findAncestor(parent, ts.isFunctionLike);
      return !!fn && isClassName(functionName(fn));
    }
    if (ts.isFunctionLike(parent) || ts.isBlock(parent) || ts.isSourceFile(parent) || isStatement(parent)) return false;
  }
  return false;
}

// owner: the literal (or whole template) the text belongs to. group: the class expression it is joined into,
// the JSX attribute when there is one. element: the tag of that attribute's JSX element.
type Literal = Range & { classes: boolean; owner: ts.Node; group: ts.Node; element?: string };

/** The class expression a literal is joined into, and the JSX element that receives it. */
function classGroup(owner: ts.Node): Pick<Literal, "group" | "element"> {
  let group = owner;
  for (let node = owner.parent; node && !ts.isFunctionLike(node) && !isStatement(node); node = node.parent) {
    if (ts.isJsxAttribute(node)) return { group: node, element: node.parent.parent.tagName.getText() };
    if (ts.isCallExpression(node) && CLASS_HELPERS.has(nameOf(node.expression) ?? "")) group = node;
  }
  return { group };
}

/** The text of every string and template literal, without quotes and `${…}`, with whether it holds classes. */
function literalRanges(source: string, fileName: string): Literal[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind(fileName));
  const out: Literal[] = [];
  const visit = (node: ts.Node) => {
    let range: Range | undefined;
    const start = node.getStart(file);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      range = { start: start + 1, end: node.end - 1 };
    } else if (ts.isTemplateTail(node)) {
      range = { start: start + 1, end: node.end - 1, gluedStart: true };
    } else if (ts.isTemplateHead(node)) {
      range = { start: start + 1, end: node.end - 2, gluedEnd: true };
    } else if (ts.isTemplateMiddle(node)) {
      range = { start: start + 1, end: node.end - 2, gluedStart: true, gluedEnd: true };
    }
    if (range && range.end > range.start) {
      let owner: ts.Node = node;
      let context = templateContext(node);
      if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
        const template = ts.isTemplateHead(node) ? node.parent : node.parent.parent;
        if (ts.isTemplateExpression(template)) {
          const index = template.templateSpans.findIndex((span) => span.literal === node);
          const chunks = ts.isTemplateHead(node) ? [] : textBefore(template, index);
          const outer = templateContext(template, ts.isTemplateHead(node), ts.isTemplateTail(node));
          owner = template;
          context = { ...outer, depth: chunks.reduce((depth, chunk) => bracketDepth(chunk, depth), outer.depth) };
        }
      }
      out.push({
        ...range,
        gluedStart: range.gluedStart || context.gluedStart,
        gluedEnd: range.gluedEnd || context.gluedEnd,
        depth: context.depth,
        classes: inClassContext(owner),
        owner,
        ...classGroup(owner),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return out;
}

function rewriteRanges(source: string, ranges: Range[], rewrite: (text: string, range: Range) => string): string {
  let out = source;
  for (const range of [...ranges].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, range.start) + rewrite(out.slice(range.start, range.end), range) + out.slice(range.end);
  }
  return out;
}

/** Applies `rewrite` to the text outside CSS block comments. */
function outsideBlockComments(text: string, rewrite: (part: string) => string): string {
  return text
    .split(/(\/\*[\s\S]*?\*\/)/)
    .map((part, index) => (index % 2 ? part : rewrite(part)))
    .join("");
}

/** Where the utility of a class starts: after its last variant colon outside `[…]` brackets. */
function utilityStart(token: string): number {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < token.length; i += 1) {
    if (token[i] === "[") depth += 1;
    else if (token[i] === "]") depth = Math.max(0, depth - 1);
    else if (token[i] === ":" && depth === 0) start = i + 1;
  }
  return start;
}

/** The variants and utility of a spacing class without its value (`md:py-` for `md:py-2`), if it is one. */
function spacingKey(token: string): string | undefined {
  const split = utilityStart(token);
  const match = token.slice(split).match(ANY_SPACING_UTILITY);
  return match ? token.slice(0, split) + match[1] : undefined;
}

/** The whole classes of a literal: outside brackets and not glued to a substitution. */
function wholeClasses(text: string, range: Range): { token: string; whole: boolean }[] {
  let depth = range.depth ?? 0;
  return text.split(/(\s+)/).map((token, index, tokens) => {
    const inBrackets = depth > 0;
    depth = bracketDepth(token, depth);
    const glued = (range.gluedStart && index === 0) || (range.gluedEnd && index === tokens.length - 1);
    return { token, whole: !inBrackets && !glued && !/^\s*$/.test(token) };
  });
}

/** True when the two literals can never be rendered together: opposite branches of a ternary, or `a || b`. */
function exclusive(a: ts.Node, b: ts.Node): boolean {
  const ancestors = new Map<ts.Node, ts.Node>();
  for (let child = a, node = a.parent; node; child = node, node = node.parent) ancestors.set(node, child);
  for (let child = b, node = b.parent; node; child = node, node = node.parent) {
    const fromA = ancestors.get(node);
    if (!fromA) continue;
    if (ts.isConditionalExpression(node))
      return fromA !== child && fromA !== node.condition && child !== node.condition;
    if (ts.isBinaryExpression(node)) {
      const operator = node.operatorToken.kind;
      return (
        fromA !== child && (operator === ts.SyntaxKind.BarBarToken || operator === ts.SyntaxKind.QuestionQuestionToken)
      );
    }
    return false;
  }
  return false;
}

/**
 * Spacing utilities (`py-`, `md:gap-`) that two classes of one class expression set together. Tailwind orders the
 * classes of one utility by name, and every token name sorts after every number, so rewriting one of them can change
 * which one wins.
 */
function conflictingKeys(literals: Literal[], source: string): Map<ts.Node, Set<string>> {
  const seen = new Map<ts.Node, Map<string, { token: string; owner: ts.Node }[]>>();
  for (const literal of literals) {
    const byKey = seen.get(literal.group) ?? new Map<string, { token: string; owner: ts.Node }[]>();
    seen.set(literal.group, byKey);
    for (const { token, whole } of wholeClasses(source.slice(literal.start, literal.end), literal)) {
      const key = whole ? spacingKey(token) : undefined;
      if (key) byKey.set(key, [...(byKey.get(key) ?? []), { token, owner: literal.owner }]);
    }
  }
  const out = new Map<ts.Node, Set<string>>();
  for (const [group, byKey] of seen) {
    const keys = new Set<string>();
    for (const [key, uses] of byKey) {
      const clash = uses.some((a, i) =>
        uses.slice(i + 1).some((b) => a.token !== b.token && (a.owner === b.owner || !exclusive(a.owner, b.owner))),
      );
      if (clash) keys.add(key);
    }
    out.set(group, keys);
  }
  return out;
}

/**
 * Numeric spacing classes become token classes, only inside class strings (never in comments, prose or data).
 * A class stays numeric when another class of its utility can apply with it: in the same class expression, or in
 * the base classes of the JSX component it is passed to (`mergedBases`, from `clsxMergedBases`).
 */
export function spacingToTokens(
  source: string,
  fileName = "file.tsx",
  mergedBases: Map<string, Set<string>> = new Map(),
): Rewrite {
  let count = 0;
  const literals = literalRanges(source, fileName).filter((literal) => literal.classes);
  const conflicts = conflictingKeys(literals, source);
  const out = rewriteRanges(source, literals, (text, range) => {
    const literal = range as Literal;
    const element = literal.element ?? "";
    const base = mergedBases.get(element) ?? mergedBases.get(element.split(".").pop() ?? "");
    return wholeClasses(text, literal)
      .map(({ token, whole }) => {
        if (!whole) return token;
        const key = spacingKey(token);
        if (!key || conflicts.get(literal.group)?.has(key) || base?.has(key)) return token;
        const split = utilityStart(token);
        const match = token.slice(split).match(SPACING_UTILITY);
        if (!match) return token;
        count += 1;
        return `${token.slice(0, split)}${match[1]}${SPACING_TOKENS[match[2]]}`;
      })
      .join("");
  });
  return { source: out, count };
}

/** True when `node` names a class prop (`className`, `props.contentClassName`). */
const isClassProp = (node: ts.Node) =>
  (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) && isClassName(node);

/** True when the expression joins class strings without tailwind-merge (clsx-like helpers, templates, `+`, join). */
function isPlainJoin(node: ts.Node): boolean {
  if (ts.isTemplateExpression(node)) return true;
  if (ts.isBinaryExpression(node)) return node.operatorToken.kind === ts.SyntaxKind.PlusToken;
  if (!ts.isCallExpression(node)) return false;
  const callee = nameOf(node.expression) ?? "";
  if (callee === "join") return true;
  return CLASS_HELPERS.has(callee) && !MERGING_HELPERS.has(callee);
}

/**
 * For each component of the file, the spacing utilities of the base classes it joins with a class prop without
 * tailwind-merge (`cn("py-4", className)` with a clsx-only `cn`). A caller's class of the same utility competes with
 * the base by name order, so rewriting it to a token can change which one wins.
 */
export function clsxMergedBases(source: string, fileName = "file.tsx"): Map<string, Set<string>> {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind(fileName));
  const out = new Map<string, Set<string>>();
  const within = (node: ts.Node, test: (n: ts.Node) => boolean): boolean =>
    test(node) || (!ts.isFunctionLike(node) && !!ts.forEachChild(node, (child) => within(child, test) || undefined));
  const visit = (node: ts.Node, component?: string) => {
    let name = component;
    if ((ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name && ts.isIdentifier(node.name)) {
      if (/^[A-Z]/.test(node.name.text)) name = node.name.text;
    }
    if (name && isPlainJoin(node) && within(node, isClassProp)) {
      const keys = out.get(name) ?? new Set<string>();
      within(node, (child) => {
        if (ts.isStringLiteralLike(child) || ts.isTemplateLiteralToken(child)) {
          for (const token of child.text.split(/\s+/)) {
            const key = spacingKey(token);
            if (key) keys.add(key);
          }
        }
        return false;
      });
      if (keys.size) out.set(name, keys);
    }
    ts.forEachChild(node, (child) => visit(child, name));
  };
  visit(file);
  return out;
}

const COLOR_FALLBACK =
  /var\(\s*(--[\w-]+)\s*,\s*(?:#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})|(?:rgba?|hsla?)\([^()]*\))\s*\)/g;

/**
 * `var(--token, #hex)` becomes `var(--token)` when `--token` is a design token; other custom properties keep it.
 * Stylesheets are rewritten outside comments; scripts only inside their string and template literals.
 */
export function dropTokenFallbacks(source: string, tokenNames: Set<string>, fileName = "file.css"): Rewrite {
  let count = 0;
  const drop = (text: string) =>
    outsideBlockComments(text, (part) =>
      part.replace(COLOR_FALLBACK, (match, name: string) => {
        if (!tokenNames.has(name)) return match;
        count += 1;
        return `var(${name})`;
      }),
    );
  const out = /\.[jt]sx?$/.test(fileName) ? rewriteRanges(source, literalRanges(source, fileName), drop) : drop(source);
  return { source: out, count };
}
