/**
 * Rendered elements of one React file: how many JSX elements come from @humansignal/ui and how many from a local
 * look-alike of a design-system component. Raw controls are counted by the raw-control rule of ds:check.
 *
 * The file goes through Bun's transpiler first, which drops type-only imports and turns every JSX element into a
 * createElement call whose first argument is the tag, so TypeScript generics and type positions never count. The
 * classic runtime is used because the automatic one rejects a key after a spread, which some files have.
 */
export type ElementCount = { ds: number; local: number };
export type ImportBinding = { spec: string; imported: string; local: string };

const classic = JSON.stringify({ compilerOptions: { jsx: "react" } });
const transpilers = {
  tsx: new Bun.Transpiler({ loader: "tsx", tsconfig: classic }),
  jsx: new Bun.Transpiler({ loader: "jsx", tsconfig: classic }),
};

const IMPORT = /^import\s+([^"';]*?)\s+from\s*["']([^"']+)["']/gm;
const NAMED = /\{([^}]*)\}/;
const NAMESPACE = /\*\s+as\s+([\w$]+)/;
const DEFAULT = /^([\w$]+)\s*(?:,|$)/;
const JSX_CALL = /\bcreateElement\(\s*("[^"]*"|[A-Za-z_$][\w$]*)/g;

/** Value bindings created by the import statements of transpiled code. */
export function importBindings(js: string): ImportBinding[] {
  const out: ImportBinding[] = [];
  for (const [, clause, spec] of js.matchAll(IMPORT)) {
    const head = clause.trim();
    const byDefault = head.match(DEFAULT);
    if (byDefault) out.push({ spec, imported: "default", local: byDefault[1] });
    const named = head.match(NAMED);
    if (named) {
      for (const part of named[1].split(",")) {
        const [imported, local] = part.trim().split(/\s+as\s+/);
        if (imported) out.push({ spec, imported, local: local ?? imported });
      }
    }
    const namespace = head.match(NAMESPACE);
    if (namespace) out.push({ spec, imported: "*", local: namespace[1] });
  }
  return out;
}

/** The tag of every element in transpiled code: an intrinsic tag name, or the root identifier of a component. */
export function jsxTags(js: string): string[] {
  return [...js.matchAll(JSX_CALL)].map(([, tag]) => (tag.startsWith('"') ? tag.slice(1, -1) : tag));
}

export const isDsSpec = (spec: string) =>
  (spec === "@humansignal/ui" || spec.startsWith("@humansignal/ui/")) && !spec.startsWith("@humansignal/ui/shad");

/**
 * Elements of one file. `isLocal(spec, imported)` says whether an import names a local look-alike of a DS component.
 * Null when the transpiler cannot read the file.
 */
export function countElements(
  file: string,
  source: string,
  isLocal: (spec: string, imported: string) => boolean,
): ElementCount | null {
  let js: string;
  try {
    js = transpilers[file.endsWith(".jsx") ? "jsx" : "tsx"].transformSync(source);
  } catch {
    return null;
  }
  const ds = new Set<string>();
  const local = new Set<string>();
  for (const b of importBindings(js)) {
    if (isDsSpec(b.spec)) ds.add(b.local);
    else if (isLocal(b.spec, b.imported)) local.add(b.local);
  }
  const count: ElementCount = { ds: 0, local: 0 };
  if (!ds.size && !local.size) return count;
  for (const tag of jsxTags(js)) {
    if (ds.has(tag)) count.ds += 1;
    else if (local.has(tag)) count.local += 1;
  }
  return count;
}
