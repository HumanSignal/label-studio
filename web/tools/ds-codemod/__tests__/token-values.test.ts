import { describe, expect, test } from "bun:test";
import { clsxMergedBases, dropTokenFallbacks, spacingToTokens } from "../token-values";

describe("spacingToTokens", () => {
  test("rewrites every on-scale value to its token", () => {
    expect(spacingToTokens(`<div className="p-0.5 px-1 gap-2 mt-4 mb-6 space-y-8 gap-x-10" />`).source).toBe(
      `<div className="p-tightest px-tighter gap-tight mt-base mb-wide space-y-wider gap-x-widest" />`,
    );
  });

  test("keeps variants, the important modifier and negative margins", () => {
    expect(spacingToTokens(`cn("md:p-2 hover:!px-4 -mt-1 lg:-mx-2")`).source).toBe(
      `cn("md:p-tight hover:!px-base -mt-tighter lg:-mx-tight")`,
    );
  });

  test("leaves off-scale, arbitrary, zero and non-spacing classes alone", () => {
    const source = `<div className="p-3 px-1.5 py-2.5 gap-5 m-[12px] p-0 w-2 h-4 text-2 mt-16 grid-cols-2" />`;
    expect(spacingToTokens(source)).toEqual({ source, count: 0 });
  });

  test("does not match inside longer names", () => {
    const source = `<div className="step-2 data-p-2 top-p-4 sp-2 xp-2 p-2x" />`;
    expect(spacingToTokens(source).count).toBe(0);
  });

  test("rewrites class strings in templates, conditionals, class props, variables, parameters, returns and cva variants", () => {
    const source = [
      '<a className={`p-2 ${on ? "m-1" : "m-2"} gap-4`} />;',
      '<Panel contentClassName="px-4" />;',
      'const styles = { headerClassName: "py-2" };',
      'const buttonClasses = "mt-6";',
      'const variants = cva("p-1", { variants: { size: { sm: "px-2" } } });',
      'cn({ "p-4": active });',
      'export const CHIP_CLASS = "py-0.5";',
      'const Chips = ({ className = "gap-1" }) => null;',
      'function scoreCellClass(v) { if (v) return "py-1"; return ""; }',
      'const rowClassName = (on) => (on ? "pl-2" : "");',
    ].join("\n");
    expect(spacingToTokens(source).source).toBe(
      [
        '<a className={`p-tight ${on ? "m-tighter" : "m-tight"} gap-base`} />;',
        '<Panel contentClassName="px-base" />;',
        'const styles = { headerClassName: "py-tight" };',
        'const buttonClasses = "mt-wide";',
        'const variants = cva("p-tighter", { variants: { size: { sm: "px-tight" } } });',
        'cn({ "p-base": active });',
        'export const CHIP_CLASS = "py-tightest";',
        'const Chips = ({ className = "gap-tighter" }) => null;',
        'function scoreCellClass(v) { if (v) return "py-tighter"; return ""; }',
        'const rowClassName = (on) => (on ? "pl-tight" : "");',
      ].join("\n"),
    );
  });

  test("leaves code, data, URLs, SVG paths, prose and comments alone", () => {
    const source = [
      "const prev = items[m-1];",
      'const url = "/api/projects/p-1/tasks";',
      '<path d="M0 0 m-1 2" />;',
      'const options = [{ key: "p-1", value: "p-2" }];',
      'fetchClasses(id, "p-2");',
      'function label(v) { return "p-2"; }',
      'const subclassOf = isA("m-1");',
      'const prompt = `className="flex gap-2" does nothing here`;',
      "// p-4",
      '<a className="p-2" /* p-4 */ />;',
      "/*",
      " p-4",
      "*/",
    ].join("\n");
    const result = spacingToTokens(source);
    expect(result.count).toBe(1);
    expect(result.source).toBe(source.replace('className="p-2"', 'className="p-tight"'));
  });

  test("leaves tested, compared and looked-up strings inside class expressions alone", () => {
    const source = [
      '<div className={step === "p-1" ? "px-2" : "px-4"} />;',
      'cn(tier === "p-2" && "gap-2");',
      'cn({ "p-4": status === "m-1" });',
      'cn({ "p-4": "m-1" });',
      '<a className={styles["p-1"]} />;',
      'const tierClasses = { "p-1": "px-2" };',
      'const variants = cva("p-1", { variants: { tier: { "p-1": "px-2" } }, defaultVariants: { tier: "p-1" } });',
      'cva("", { compoundVariants: [{ tier: "p-1", className: "m-2" }] });',
      'const badgeClass = (x as "p-1") ? "p-2" : "";',
    ].join("\n");
    expect(spacingToTokens(source).source).toBe(
      [
        '<div className={step === "p-1" ? "px-tight" : "px-base"} />;',
        'cn(tier === "p-2" && "gap-tight");',
        'cn({ "p-base": status === "m-1" });',
        'cn({ "p-base": "m-1" });',
        '<a className={styles["p-1"]} />;',
        'const tierClasses = { "p-1": "px-tight" };',
        'const variants = cva("p-tighter", { variants: { tier: { "p-1": "px-tight" } }, defaultVariants: { tier: "p-1" } });',
        'cva("", { compoundVariants: [{ tier: "p-1", className: "m-tight" }] });',
        'const badgeClass = (x as "p-1") ? "p-tight" : "";',
      ].join("\n"),
    );
  });

  test("rewrites only the utility of a class, outside brackets, named groups and template substitutions", () => {
    const source =
      "<div className={`data-[tier=p-1]:hidden group/p-2:flex before:content-['p-1'] bg-[url(/img/p-2)] " +
      "data-[on=true]:p-2 p-2${x} ${y}m-1 gap-4 ${z} mt-1`} />";
    expect(spacingToTokens(source).source).toBe(
      "<div className={`data-[tier=p-1]:hidden group/p-2:flex before:content-['p-1'] bg-[url(/img/p-2)] " +
        "data-[on=true]:p-tight p-2${x} ${y}m-1 gap-base ${z} mt-tighter`} />",
    );
  });

  test("treats class maps inside conditions, arrays and parentheses as class maps", () => {
    const source = [
      'cn(ready && { "p-4": status || "m-1" });',
      'clsx([{ "p-4": "m-1" }]);',
      'cn(on ? ({ "gap-2": "m-1" }) : "px-2");',
    ].join("\n");
    expect(spacingToTokens(source).source).toBe(
      [
        'cn(ready && { "p-base": status || "m-1" });',
        'clsx([{ "p-base": "m-1" }]);',
        'cn(on ? ({ "gap-tight": "m-1" }) : "px-tight");',
      ].join("\n"),
    );
  });

  test("leaves strings glued to the template text around their substitution alone", () => {
    const source = [
      '<div className={`data-[tier=${active ? "p-1" : "p-2"}]:hidden`} />;',
      '<div className={`group/${name ?? "p-2"}:flex`} />;',
      '<div className={`prefix-${variant || "p-1"}`} />;',
      '<div className={`relative${on ? " p-2" : ""} ${big ? "gap-4 m-1" : "m-2"}`} />;',
    ].join("\n");
    expect(spacingToTokens(source).source).toBe(
      [
        '<div className={`data-[tier=${active ? "p-1" : "p-2"}]:hidden`} />;',
        '<div className={`group/${name ?? "p-2"}:flex`} />;',
        '<div className={`prefix-${variant || "p-1"}`} />;',
        '<div className={`relative${on ? " p-tight" : ""} ${big ? "gap-base m-tighter" : "m-tight"}`} />;',
      ].join("\n"),
    );
  });

  test("treats scn class maps like cn class maps", () => {
    expect(spacingToTokens('scn({ "p-4": status || "m-1" });').source).toBe('scn({ "p-base": status || "m-1" });');
  });

  test("treats class maps behind spreads and type assertions as class maps, and *class keys as class names", () => {
    const source = [
      'cn({ ...(cond && { "p-4": "m-1" }) });',
      'cn({ "p-4": "m-1" } as Record<string, unknown>);',
      'cn({ "p-4": "m-1" } satisfies Record<string, unknown>);',
      'cn({ "p-4": "m-1" }!);',
      'cn({ "btn-class": fallback || "m-1" });',
    ].join("\n");
    expect(spacingToTokens(source).source).toBe(
      [
        'cn({ ...(cond && { "p-base": "m-1" }) });',
        'cn({ "p-base": "m-1" } as Record<string, unknown>);',
        'cn({ "p-base": "m-1" } satisfies Record<string, unknown>);',
        'cn({ "p-base": "m-1" }!);',
        'cn({ "btn-class": fallback || "m-1" });',
      ].join("\n"),
    );
  });

  test("leaves strings glued to an adjacent substitution, or inside brackets across substitutions, alone", () => {
    const source = [
      '<div className={`prefix-${a}${b ? "p-1" : "p-2"}`} />;',
      '<div className={`${b ? "p-1" : "p-2"}${a}-suffix`} />;',
      '<div className={`data-[tier=${a} ${b ? "p-1 foo" : ""}]:hidden`} />;',
      '<div className={`data-[tier=${active ? " p-1 " : "foo p-2 bar"}]:hidden`} />;',
      "<div className={`data-[a=${x} p-1 ${y}]:hidden p-2`} />;",
    ].join("\n");
    expect(spacingToTokens(source).source).toBe(source.replace("]:hidden p-2`", "]:hidden p-tight`"));
  });

  test("carries glue and brackets through nested templates", () => {
    const source = [
      '<div className={`data-[tier=${`${active ? "p-1" : "p-2"}`}]:hidden`} />;',
      '<div className={`prefix-${`${on ? "m-1" : ""} gap-4`}`} />;',
      '<div className={`p-2 ${`x ${on ? "m-1" : ""}`} gap-4`} />;',
    ].join("\n");
    expect(spacingToTokens(source).source).toBe(
      [
        '<div className={`data-[tier=${`${active ? "p-1" : "p-2"}`}]:hidden`} />;',
        '<div className={`prefix-${`${on ? "m-1" : ""} gap-base`}`} />;',
        '<div className={`p-tight ${`x ${on ? "m-tighter" : ""}`} gap-base`} />;',
      ].join("\n"),
    );
  });

  test("leaves classes of one utility that apply together alone, since Tailwind orders them by name", () => {
    const source = [
      '<div className="py-1 py-4 px-2" />;',
      '<div className={cn("gap-2", wide && "gap-6")} />;',
      '<div className={`mt-1 ${on ? "mt-4" : ""}`} />;',
      '<div className={on ? "py-1" : "py-4"} />;',
      '<div className={cn(on ? "gap-2" : "gap-4", "md:gap-6")} />;',
    ].join("\n");
    expect(spacingToTokens(source).source).toBe(
      [
        '<div className="py-1 py-4 px-tight" />;',
        '<div className={cn("gap-2", wide && "gap-6")} />;',
        '<div className={`mt-1 ${on ? "mt-4" : ""}`} />;',
        '<div className={on ? "py-tighter" : "py-base"} />;',
        '<div className={cn(on ? "gap-tight" : "gap-base", "md:gap-wide")} />;',
      ].join("\n"),
    );
  });

  test("leaves classes alone where a component joins base classes of the same utility without tailwind-merge", () => {
    const library = [
      "const AccordionTrigger = forwardRef(({ className, ...props }, ref) => (",
      '  <Trigger className={cn("flex py-4 font-medium", className)} {...props} />',
      "));",
      'const Card = ({ className }) => <div className={cnm("p-4", className)} />;',
      "function Pill({ className }) { return <span className={`px-2 ${className}`} />; }",
      'const Plain = () => <div className="py-4" />;',
    ].join("\n");
    const bases = clsxMergedBases(library);
    expect([...bases.keys()]).toEqual(["AccordionTrigger", "Pill"]);
    expect([...(bases.get("AccordionTrigger") ?? [])]).toEqual(["py-"]);

    const app = [
      '<AccordionTrigger className="py-1 mt-2" />;',
      '<Accordion.AccordionTrigger className="py-1" />;',
      '<Pill className="px-1 py-1" />;',
      '<Card className="p-2" />;',
    ].join("\n");
    expect(spacingToTokens(app, "app.tsx", bases).source).toBe(
      [
        '<AccordionTrigger className="py-1 mt-tight" />;',
        '<Accordion.AccordionTrigger className="py-1" />;',
        '<Pill className="px-1 py-tighter" />;',
        '<Card className="p-tight" />;',
      ].join("\n"),
    );
  });

  test("parses .ts files without JSX", () => {
    const source = `const panelClassName = <string>"p-2";`;
    expect(spacingToTokens(source, "x.ts").source).toBe(`const panelClassName = <string>"p-tight";`);
  });
});

describe("dropTokenFallbacks", () => {
  const tokens = new Set(["--color-neutral-content", "--color-primary-surface"]);

  test("drops a colour fallback on a defined token", () => {
    expect(
      dropTokenFallbacks(
        "color: var(--color-neutral-content, #333);\nbackground: var( --color-primary-surface , rgba(0, 0, 0, 0.1) );",
        tokens,
      ),
    ).toEqual({ source: "color: var(--color-neutral-content);\nbackground: var(--color-primary-surface);", count: 2 });
  });

  test("keeps the fallback when the name is not a token", () => {
    const source = "color: var(--local-accent, #fff); fill: var(--color-made-up, #000);";
    expect(dropTokenFallbacks(source, tokens)).toEqual({ source, count: 0 });
  });

  test("keeps fallbacks that are not colour literals", () => {
    const source = "color: var(--color-neutral-content, var(--other)); padding: var(--color-neutral-content, 4px);";
    expect(dropTokenFallbacks(source, tokens).count).toBe(0);
  });

  test("leaves stylesheet comments alone", () => {
    const source = "/* color: var(--color-neutral-content, #333); */\ncolor: var(--color-neutral-content, #333);";
    expect(dropTokenFallbacks(source, tokens)).toEqual({
      source: "/* color: var(--color-neutral-content, #333); */\ncolor: var(--color-neutral-content);",
      count: 1,
    });
  });

  test("rewrites only string and template literals in scripts", () => {
    const source = [
      "// var(--color-neutral-content, #333)",
      'const style = { color: "var(--color-neutral-content, #333)" };',
      "const css = `background: var(--color-primary-surface, #fff);`;",
    ].join("\n");
    expect(dropTokenFallbacks(source, tokens, "x.tsx").source).toBe(
      [
        "// var(--color-neutral-content, #333)",
        'const style = { color: "var(--color-neutral-content)" };',
        "const css = `background: var(--color-primary-surface);`;",
      ].join("\n"),
    );
  });
});
