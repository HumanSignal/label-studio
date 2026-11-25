import { cnm } from "./utils";

describe("cnm", () => {
  it("lets a later padding replace the design system's named padding", () => {
    expect(cnm("min-h-0 px-wide pb-wide", "p-0")).toBe("min-h-0 p-0");
  });

  it("merges named gap and margin steps", () => {
    expect(cnm("gap-tight mt-base", "gap-wide")).toBe("mt-base gap-wide");
  });

  it("keeps classes that do not conflict", () => {
    expect(cnm("px-wide", "py-base")).toBe("px-wide py-base");
  });
});
