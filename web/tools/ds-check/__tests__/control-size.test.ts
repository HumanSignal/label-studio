import { describe, expect, test } from "bun:test";
import { CONTROL_SIZE_RULE, controlSizeFindings, heightVariableFindings } from "../control-size";

const FILE = "apps/labelstudio/src/pages/Page.tsx";
const lines = (source: string) => controlSizeFindings(FILE, source).map((finding) => finding.line);
const page = (body: string) => `import { Button, Input, Select, SegmentedControl, Typography } from "@humansignal/ui";
export const Page = () => (
${body}
);`;

describe("control-size", () => {
  test("controls that share a parent and pass different sizes", () => {
    const source = page(`  <div>
    <Select size="small" options={[]} />
    <Input />
    <Button size="small">OCR</Button>
  </div>`);
    const findings = controlSizeFindings(FILE, source);
    expect(findings.map((finding) => finding.rule)).toEqual([CONTROL_SIZE_RULE]);
    expect(findings[0].line).toBe(3);
    expect(findings[0].message).toContain("(medium, small)");
  });

  test("a row with one size passes, whether the size is written or the default", () => {
    expect(lines(page(`  <div><Select size="small" options={[]} /><Button size="small">Go</Button></div>`))).toEqual(
      [],
    );
    expect(lines(page(`  <div><Select options={[]} /><Button>Go</Button><Input size="medium" /></div>`))).toEqual([]);
  });

  test("a control in a bare wrapper or behind a condition still belongs to the row", () => {
    const wrapped = page(`  <div>
    <div style={{ width: 170 }}><Input size="smaller" /></div>
    {ready && <Button size="small">Go</Button>}
  </div>`);
    expect(lines(wrapped)).toEqual([3]);
  });

  test("controls in different containers are not a row", () => {
    const source = page(`  <section>
    <header><Typography>Title</Typography><Button size="small">Edit</Button></header>
    <form><Input /><Select options={[]} /></form>
  </section>`);
    expect(lines(source)).toEqual([]);
  });

  test("a computed or spread size is not judged", () => {
    expect(lines(page("  <div><Button size={size}>Go</Button><Input /></div>"))).toEqual([]);
    expect(lines(page(`  <div><Button {...props}>Go</Button><Input size="small" /></div>`))).toEqual([]);
  });

  test("a height forced on a control with a class or an inline style", () => {
    expect(lines(page(`  <Button className="h-8 w-8">X</Button>`))).toEqual([3]);
    expect(lines(page("  <Select style={{ minHeight: 30 }} options={[]} />"))).toEqual([3]);
    expect(lines(page(`  <SegmentedControl className="shrink-0 w-fit" selectedOption="a" />`))).toEqual([]);
  });

  test("generics, comparisons and quotes in text do not hide a row", () => {
    const source = `import { Button, Input } from "@humansignal/ui";
const pick = <T,>(items: T[], index: number) => (index < items.length ? items[index] : undefined);
export const Page = ({ items }: { items: Array<string> }) => (
  <section>
    <p>Don't mix sizes</p>
    {items.length > 0 ? <div><Button size="small">Go</Button><Input /></div> : null}
  </section>
);`;
    expect(lines(source)).toEqual([6]);
  });

  test("only controls imported from the design system count", () => {
    const source = `import { Button } from "./local";
export const Page = () => <div><Button size="small" /><Button /></div>;`;
    expect(lines(source)).toEqual([]);
  });

  test("a control's height variable set in app code", () => {
    const css = ".switch {\n  --select-trigger-height: 56px;\n}";
    expect(heightVariableFindings("apps/a/Switch.module.css", css).map((finding) => finding.line)).toEqual([2]);
    expect(heightVariableFindings(FILE, `<div style={{ "--field-height": "30px" }} />`)).toHaveLength(1);
    expect(heightVariableFindings(FILE, "height: var(--select-trigger-height);")).toEqual([]);
  });
});
