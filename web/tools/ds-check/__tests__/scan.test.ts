import path from "node:path";
import { describe, expect, test } from "bun:test";
import { buildContext, scanSource } from "../scan";

const repoRoot = "/repo";
const webRoot = "/repo/services/lse/web";
const ctxManifest = {
  components: {
    Badge: {
      name: "Badge",
      exports: ["Badge"],
      replaces: ["services/lse/web/apps/labelstudio/src/components/Tag/Tag.jsx"],
    },
    Dropdown: {
      name: "Dropdown",
      exports: ["Dropdown"],
      replaces: ["services/lse/web/apps/labelstudio/src/components/Menu", 'jsx:<span className="menu">'],
    },
    Callout: {
      name: "Callout",
      exports: ["Callout", "CalloutTitle"],
      replaces: [],
      deprecated: { replaced_by: "Message", reason: "" },
    },
    Message: { name: "Message", exports: ["Message"], replaces: [] },
  },
};
const ctx = buildContext({
  repoRoot,
  webRoot,
  tokenNames: new Set(["--color-neutral-content", "--spacing-base"]),
  manifest: ctxManifest,
  isDirectory: (abs) => abs.endsWith("/components/Menu"),
});

const file = path.join(webRoot, "apps/labelstudio/src/pages/Page.tsx");
const rules = (source: string, at = file) => scanSource(at, source, ctx).map((f) => f.rule);

describe("ds-check scanner", () => {
  test("colour literals in tsx and css", () => {
    expect(rules(`const a = { color: "#fff", b: "rgba(0,0,0,.2)" };`)).toEqual(["color-literal", "color-literal"]);
    expect(rules(".a { color: #12345678; background: hsl(0 0% 0%); }", file.replace(".tsx", ".module.css"))).toEqual([
      "color-literal",
      "color-literal",
    ]);
  });

  test("css comments and url() payloads never count", () => {
    const css = "/* #fff */ .a { background: url(data:image/svg+xml;#abc); }";
    expect(rules(css, file.replace(".tsx", ".css"))).toEqual([]);
  });

  test("unknown tokens in css; known tokens pass", () => {
    const css = ".a { color: var(--color-neutral-content); padding: var(--spacing-huge); }";
    expect(rules(css, file.replace(".tsx", ".css"))).toEqual(["unknown-token"]);
  });

  test("legacy Icon* imports, Phosphor *Icon imports pass", () => {
    expect(rules(`import { IconCross, CheckIcon } from "@humansignal/icons";`)).toEqual(["legacy-icon"]);
  });

  test("imports of a replaced file, relative or aliased", () => {
    expect(rules(`import { Tag } from "../components/Tag/Tag";`)).toEqual(["replaced-import"]);
    expect(rules(`import Tag from "apps/labelstudio/src/components/Tag/Tag";`)).toEqual(["replaced-import"]);
    expect(rules(`import { Tag } from "../components/Tagger";`)).toEqual([]);
  });

  test("imports through the app alias @/", () => {
    expect(rules(`import { Tag } from "@/components/Tag/Tag";`)).toEqual(["replaced-import"]);
    expect(rules(`import { Menu } from "@/components/Menu";`)).toEqual(["replaced-import"]);
    expect(rules(`import { x } from "@/utils/x";`)).toEqual([]);
  });

  test("imports inside a replaced directory", () => {
    expect(rules(`import { Menu } from "../components/Menu/Menu";`)).toEqual(["replaced-import"]);
    expect(rules(`import { Menu } from "../components/Menu";`)).toEqual(["replaced-import"]);
  });

  test("the replaced file itself does not count its own sibling imports as replaced", () => {
    const self = path.join(webRoot, "apps/labelstudio/src/components/Menu/Menu.jsx");
    expect(rules(`import { MenuItem } from "./MenuItem";`, self)).toEqual([]);
  });

  test("imports through the @humansignal/<lib>/... alias", () => {
    expect(rules(`import { Tag } from "@humansignal/labelstudio/src/components/Tag/Tag";`)).toEqual([]);
    const aliasCtx = buildContext({
      repoRoot,
      webRoot,
      tokenNames: new Set(),
      manifest: {
        components: {
          Dropdown: {
            name: "Dropdown",
            exports: ["Dropdown"],
            replaces: ["services/lso/web/libs/datamanager/src/components/Common/Menu/Menu.jsx"],
          },
        },
      },
      isDirectory: () => false,
    });
    const found = scanSource(
      file,
      `import { Menu } from "@humansignal/datamanager/src/components/Common/Menu/Menu";`,
      aliasCtx,
    );
    expect(found.map((f) => f.rule)).toEqual(["replaced-import"]);
  });

  test("names imported through a barrel that re-exports a replaced file", () => {
    const barrelCtx = buildContext({
      repoRoot,
      webRoot,
      tokenNames: new Set(),
      manifest: ctxManifest,
      isDirectory: (abs) => abs.endsWith("/components/Menu"),
      readBarrel: (abs) =>
        abs.endsWith("/src/components")
          ? `export { Tag } from "./Tag/Tag";\nexport { Menu } from "./Menu/Menu";\nexport { Userpic } from "./Userpic";`
          : null,
    });
    const found = scanSource(file, `import { Menu, Userpic, Tag as T } from "../components";`, barrelCtx);
    expect(found.map((f) => `${f.rule} ${f.message.split(" ")[0]}`)).toEqual([
      "replaced-import Menu",
      "replaced-import Tag",
    ]);
  });

  test("default and named imports together, and re-exports, are read", () => {
    expect(rules(`import Icons, { IconCross } from "@humansignal/icons";`)).toEqual(["legacy-icon"]);
    expect(rules(`export { IconCross } from "@humansignal/icons";`)).toEqual(["legacy-icon"]);
  });

  test("deprecated components imported from the DS", () => {
    expect(rules(`import { Callout, Message, CalloutTitle } from "@humansignal/ui";`)).toEqual([
      "deprecated-import",
      "deprecated-import",
    ]);
  });

  test("shad and direct Phosphor imports", () => {
    expect(rules(`import { Card } from "@humansignal/shad/components/ui/card";`)).toEqual(["shad-import"]);
    expect(rules(`import { Tabs } from "@humansignal/ui/shad/tabs";`)).toEqual(["shad-import"]);
    expect(rules(`import { X } from "@phosphor-icons/react";`)).toEqual(["phosphor-import"]);
  });

  test("path imports of @humansignal/ui internals", () => {
    expect(rules(`import { Modal, confirm } from "@humansignal/ui/lib/modal";`)).toEqual(["internal-import"]);
    expect(rules(`import { Card } from "@humansignal/ui/lib/card-new/card";`)).toEqual(["internal-import"]);
    expect(rules(`import type { SelectOption } from "@humansignal/ui/lib/select/types";`)).toEqual(["internal-import"]);
    expect(rules(`import { Button } from "@humansignal/ui";`)).toEqual([]);
    expect(rules(`import { Tabs } from "@humansignal/ui/shad/tabs";`)).toEqual(["shad-import"]);
    // stylesheet entry points and asset files are not component internals
    expect(rules(`import "@humansignal/ui/src/tailwind.css";`)).toEqual([]);
    expect(rules(`import "@humansignal/ui/src/styles.prefix.css";`)).toEqual([]);
    expect(rules(`import Star from "@humansignal/ui/src/assets/icons/star.svg";`)).toEqual([]);
    const inside = path.join(webRoot, "libs/ui/src/lib/dropdown/dropdown.tsx");
    expect(rules(`import { Modal } from "@humansignal/ui/lib/modal";`, inside)).toEqual([]);
    const [finding] = scanSource(file, `import { Modal } from "@humansignal/ui/lib/modal";`, ctx);
    expect(finding.message).toContain(`"@humansignal/ui"`);
  });

  test("Tailwind primitive palette and numeric spacing classes", () => {
    expect(rules('<div className="bg-grape-600 p-4" />')).toEqual(["tailwind-primitive", "tailwind-primitive"]);
    expect(
      rules('<div className="bg-primary-background p-tight w-4 h-4 z-10 grid-cols-2 md:p-base gap-0 m-0 text-2xl" />'),
    ).toEqual([]);
    expect(
      rules('cn("text-red-500", open && "hover:bg-blue-100", `-mt-1 gap-x-2.5 p-[12px] bg-sand-200`)'),
    ).toHaveLength(6);
    expect(rules("// text-red-500 in a comment\n/* p-4 */")).toEqual([]);
    const out = scanSource(file, '<div className="dark:text-neutral-800 gap-2" />', ctx);
    expect(out.map((f) => f.message)).toEqual([
      "Tailwind primitive colour class dark:text-neutral-800: use a semantic colour class (bg-primary-background, text-neutral-content, border-neutral-border…).",
      "Tailwind numeric spacing class gap-2: use a spacing token class (p-tight, gap-base, m-wide…).",
    ]);
    expect(rules("a { @apply p-4 bg-red-500; }", path.join(webRoot, "apps/labelstudio/src/a.css"))).toEqual([]);
  });

  test("findings carry the line and a message naming the replacement", () => {
    const [finding] = scanSource(file, `\n\nimport { Tag } from "../components/Tag/Tag";`, ctx);
    expect(finding.line).toBe(3);
    expect(finding.file).toBe("apps/labelstudio/src/pages/Page.tsx");
    expect(finding.message).toContain("Badge");
  });
});
