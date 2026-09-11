import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("tabs contents overflow (FIT-2814)", () => {
  it("keeps outer tab contents from scrolling", () => {
    const tabsTsx = readFileSync(join(import.meta.dir, "../Tabs.tsx"), "utf8");
    const tabsCss = readFileSync(join(import.meta.dir, "../Tabs.prefix.css"), "utf8");
    expect(tabsTsx).toContain('style={{ overflow: "hidden" }}');
    expect(tabsCss).toMatch(/&__contents\s*\{[^}]*overflow:\s*hidden/s);
  });
});
