import fs from "node:fs";
import path from "node:path";

describe("Annotators.prefix.css review badges", () => {
  const css = fs.readFileSync(path.join(__dirname, "Annotators.prefix.css"), "utf8");
  const importMatch = css.match(/@import\s+"(.+userpic-badge\.prefix\.css)";/);
  const sharedCss = importMatch ? fs.readFileSync(path.resolve(__dirname, importMatch[1]), "utf8") : "";

  it("imports the shared review badge stylesheet", () => {
    expect(importMatch?.[1]).toBe("../../../../../ui/src/styles/userpic-badge.prefix.css");
  });

  it("uses grape accent for fixed annotations", () => {
    const fixedBlock = sharedCss.match(/&_fixed\s*\{[^}]+\}/)?.[0] ?? "";
    expect(fixedBlock).toContain("var(--color-accent-grape-base)");
  });

  it("does not use canteloupe for fixed annotations", () => {
    const fixedBlock = sharedCss.match(/&_fixed\s*\{[^}]+\}/)?.[0] ?? "";
    expect(fixedBlock).not.toContain("canteloupe");
  });
});
