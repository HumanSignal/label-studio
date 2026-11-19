import { describe, expect, test } from "bun:test";
import { countElements, importBindings, jsxTags } from "../elements";

const LOCAL_SPINNER = "../components/Spinner/Spinner";
const isLocal = (spec: string) => spec === LOCAL_SPINNER;
const count = (source: string, file = "A.tsx") => countElements(file, source, isLocal);

describe("countElements", () => {
  test("counts JSX elements rendered from @humansignal/ui", () => {
    const source = `
      import { Button, Dropdown } from "@humansignal/ui";
      export const A = () => (
        <Dropdown.Trigger content={<Dropdown.Menu />}>
          <Button>Open</Button>
        </Dropdown.Trigger>
      );`;
    expect(count(source)).toEqual({ ds: 3, local: 0 });
  });

  test("one DS button next to two raw buttons is one DS element; raw ones are not its to count", () => {
    const source = `
      import { Button } from "@humansignal/ui";
      export const A = () => (<div><Button /><button /><button /></div>);`;
    expect(count(source)).toEqual({ ds: 1, local: 0 });
  });

  test("a type-only import does not count as using the DS", () => {
    const source = `
      import type { ButtonProps } from "@humansignal/ui";
      import { type SelectProps } from "@humansignal/ui";
      export const A = (p: ButtonProps & SelectProps) => <div {...p} />;`;
    expect(count(source)).toEqual({ ds: 0, local: 0 });
  });

  test("hooks and helpers from the DS that render nothing do not count", () => {
    const source = `
      import { useToast } from "@humansignal/ui";
      export const A = () => { const toast = useToast(); return <div onClick={() => toast.show({})} />; };`;
    expect(count(source)).toEqual({ ds: 0, local: 0 });
  });

  test("counts uses of a local look-alike under its local name", () => {
    const source = `
      import Loader from "${LOCAL_SPINNER}";
      import { Spinner } from "@humansignal/ui";
      export const A = () => (<div><Loader /><Loader size={2} /><Spinner /></div>);`;
    expect(count(source)).toEqual({ ds: 1, local: 2 });
  });

  test("TypeScript generics are not elements", () => {
    const source = `
      import { Button } from "@humansignal/ui";
      export const A = () => { const [v] = useState<Button>(null); return <Button>{String(v)}</Button>; };`;
    expect(count(source)).toEqual({ ds: 1, local: 0 });
  });

  test("a renamed DS import counts under its local name", () => {
    const source = `
      import { Button as DsButton } from "@humansignal/ui";
      export const A = () => <DsButton />;`;
    expect(count(source)).toEqual({ ds: 1, local: 0 });
  });

  test("a key after a spread does not stop the count", () => {
    const source = `
      import { Button } from "@humansignal/ui";
      export const A = (p) => <Button {...p} key="a" />;`;
    expect(count(source)).toEqual({ ds: 1, local: 0 });
  });

  test("jsx files parse too", () => {
    const source = `
      import { Button } from "@humansignal/ui";
      export const A = () => <Button />;`;
    expect(count(source, "A.jsx")).toEqual({ ds: 1, local: 0 });
  });

  test("a file the transpiler cannot read yields null", () => {
    expect(count("export const A = () => <div>;")).toBeNull();
  });
});

describe("importBindings", () => {
  test("default, namespace and named imports, with their local names", () => {
    const js = `import A, { b as c, d } from "x";\nimport * as N from "y";\nimport "side-effect";`;
    expect(importBindings(js)).toEqual([
      { spec: "x", imported: "default", local: "A" },
      { spec: "x", imported: "b", local: "c" },
      { spec: "x", imported: "d", local: "d" },
      { spec: "y", imported: "*", local: "N" },
    ]);
  });
});

describe("jsxTags", () => {
  test("the root identifier of each element, intrinsic tags in lower case", () => {
    const js = `React.createElement("div", null, React.createElement(Dropdown.Trigger, null), React.createElement(Button, {}))`;
    expect(jsxTags(js)).toEqual(["div", "Dropdown", "Button"]);
  });
});
