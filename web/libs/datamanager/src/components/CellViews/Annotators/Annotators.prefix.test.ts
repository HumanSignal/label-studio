import fs from "node:fs";
import path from "node:path";

describe("Annotators.prefix.css review badges", () => {
  const css = fs.readFileSync(path.join(__dirname, "Annotators.prefix.css"), "utf8");

  it("uses grape accent for fixed annotations", () => {
    const fixedBlock = css.match(/&_fixed\s*\{[^}]+\}/)?.[0] ?? "";
    expect(fixedBlock).toContain("var(--color-accent-grape-base)");
  });

  it("does not use canteloupe for fixed annotations", () => {
    const fixedBlock = css.match(/&_fixed\s*\{[^}]+\}/)?.[0] ?? "";
    expect(fixedBlock).not.toContain("canteloupe");
  });
});
