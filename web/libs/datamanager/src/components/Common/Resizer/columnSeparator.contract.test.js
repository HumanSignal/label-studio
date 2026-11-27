import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { Resizer } from "./Resizer";

/**
 * Guard for FIT-3307: the column resize handle and the column drop placeholder must be positioned from the same
 * numbers (`columnSeparator.prefix.css`), otherwise the two separators drift apart the next time one of them changes.
 *
 * Layout cannot be measured in jsdom, so this checks the contract instead: it reads the stylesheets as text (no
 * browser, no timing, no randomness), asserts nothing hard-codes the shared values, and evaluates the real formulas to
 * prove the placeholder is centered on the handle's line.
 */
const COMMON = join(import.meta.dir, "..");
const read = (...parts) => readFileSync(join(COMMON, ...parts), "utf8");

const sharedCss = read("Resizer", "columnSeparator.prefix.css");
const resizerCss = read("Resizer", "Resizer.module.css");
const resizerJsx = read("Resizer", "Resizer.jsx");
const headCss = read("Table", "TableHead", "TableHead.prefix.css");
const headJsx = read("Table", "TableHead", "TableHead.jsx");

const SHARED_VARS = [
  "--dm-column-separator-hit-size",
  "--dm-column-separator-inset-y",
  "--dm-column-separator-line-width",
  "--dm-column-separator-line-width-active",
];

// Returns the body of the first block that starts with `selector {`, matching braces (works with nested blocks).
const blockOf = (css, selector) => {
  const start = css.indexOf(`${selector} {`);

  if (start === -1) throw new Error(`Selector not found: ${selector}`);

  let depth = 0;

  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") depth--;
    if (depth === 0) return css.slice(css.indexOf("{", start) + 1, i);
  }
  throw new Error(`Unbalanced block: ${selector}`);
};

// Collapses whitespace, including the line breaks a formatter may add inside calc(...).
const normalize = (value) => value.replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim();

// Direct declarations of a block (comments and nested blocks removed), as { property: value }.
const declarationsOf = (body) => {
  let flat = body.replace(/\/\*[\s\S]*?\*\//g, "");
  let previous;

  do {
    previous = flat;
    // A nested block is its selector (the text after the last `;` or `}`) plus `{ ... }`.
    flat = flat.replace(/(?:^|(?<=[;}]))[^;{}]*\{[^{}]*\}/g, "");
  } while (flat !== previous);

  return Object.fromEntries(
    [...flat.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map(([, property, value]) => [property, normalize(value)]),
  );
};

const sharedValues = () =>
  Object.fromEntries(
    SHARED_VARS.map((name) => {
      const match = sharedCss.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));

      return [name, match?.[1].trim()];
    }),
  );

// Pixel value of a shared variable (the vertical inset is a spacing token, not px, so it is not resolved here).
const px = (name) => {
  const value = sharedValues()[name];
  const match = value?.match(/^(\d+(?:\.\d+)?)px$/);

  if (!match) throw new Error(`${name} is not a px value: ${value}`);
  return Number(match[1]);
};

// Evaluates a `calc(...)` made only of numbers, + - * /, parentheses and shared px variables. Returns px.
const evalCalc = (expression) => {
  const inner = expression.match(/^calc\((.*)\)$/)?.[1];

  if (inner === undefined) throw new Error(`Not a calc(): ${expression}`);

  const numeric = inner.replace(/var\((--[\w-]+)\)/g, (_, name) => String(px(name)));

  if (!/^[\d\s+\-*/().]+$/.test(numeric)) throw new Error(`Unsupported calc(): ${expression}`);
  return Function(`"use strict"; return (${numeric});`)();
};

describe("column separator geometry (FIT-3307)", () => {
  describe("shared definition", () => {
    it("defines every shared variable exactly once, on :root", () => {
      expect(sharedCss).toMatch(/:root\s*\{/);
      SHARED_VARS.forEach((name) => {
        expect(sharedCss.match(new RegExp(`${name}\\s*:`, "g"))).toHaveLength(1);
        expect(sharedValues()[name]).toBeTruthy();
      });
    });

    it("keeps the line narrower than its hit area, and the active line at least as wide as the resting one", () => {
      expect(px("--dm-column-separator-line-width")).toBeLessThan(px("--dm-column-separator-hit-size"));
      expect(px("--dm-column-separator-line-width-active")).toBeGreaterThanOrEqual(
        px("--dm-column-separator-line-width"),
      );
      expect(px("--dm-column-separator-line-width-active")).toBeLessThanOrEqual(px("--dm-column-separator-hit-size"));
    });

    it("is imported by both the resizer and the table head, so neither depends on the other loading it", () => {
      expect(resizerJsx).toContain('import "./columnSeparator.prefix.css"');
      expect(headJsx).toContain('import "../../Resizer/columnSeparator.prefix.css"');
    });
  });

  describe("resize handle (Resizer.module.css)", () => {
    const root = declarationsOf(blockOf(resizerCss, ".root"));
    const handle = declarationsOf(blockOf(blockOf(resizerCss, ".root"), ".handle"));

    it("takes its sizes from the shared variables", () => {
      expect(root["--handle-size"]).toBe("var(--dm-column-separator-line-width)");
      expect(root["--handle-size-hover"]).toBe("var(--dm-column-separator-line-width-active)");
      expect(root["--handle-interactive-size"]).toBe("var(--dm-column-separator-hit-size)");
    });

    it("takes its vertical inset from the shared variable, and its hit width from the shared size", () => {
      expect(handle.top).toBe("var(--dm-column-separator-inset-y)");
      expect(handle.bottom).toBe("var(--dm-column-separator-inset-y)");
      expect(handle.width).toBe("var(--handle-interactive-size)");
    });

    it("sits against the column's right edge, which is what the placeholder offset assumes", () => {
      expect(handle.right).toBe("0");
      expect(handle.position).toBe("absolute");
    });

    it("does not hard-code any of the shared values again", () => {
      const hardCoded = Object.entries({ ...root, top: handle.top, bottom: handle.bottom, width: handle.width })
        .filter(([property]) =>
          ["--handle-size", "--handle-size-hover", "--handle-interactive-size", "top", "bottom", "width"].includes(
            property,
          ),
        )
        .filter(([, value]) => /\d+px|var\(--spacing-/.test(value));

      expect(hardCoded).toEqual([]);
    });

    it("centers the handle's line in its hit area", () => {
      const line = declarationsOf(blockOf(blockOf(blockOf(resizerCss, ".root"), ".handle"), "&::before"));

      expect(line.left).toBe("50%");
      expect(line.transform).toBe("translateX(-50%)");
    });
  });

  describe("drop placeholder (TableHead.prefix.css)", () => {
    const placeholder = declarationsOf(blockOf(headCss, "&__drop-placeholder"));
    const firstGap = declarationsOf(blockOf(blockOf(headCss, "&__drop-placeholder"), '&[data-first-gap="true"]'));

    it("takes its vertical inset and width from the shared variables", () => {
      expect(placeholder.top).toBe("var(--dm-column-separator-inset-y)");
      expect(placeholder.bottom).toBe("var(--dm-column-separator-inset-y)");
      expect(placeholder.width).toBe("var(--dm-column-separator-line-width-active)");
    });

    it("does not hard-code any of the shared values", () => {
      const hardCoded = Object.entries({
        ...placeholder,
        ...Object.fromEntries(Object.entries(firstGap).map(([k, v]) => [`first-gap ${k}`, v])),
      })
        .filter(([property]) => /top|bottom|width|margin|radius/.test(property))
        .filter(([, value]) => /\d+px|var\(--spacing-/.test(value));

      expect(hardCoded).toEqual([]);
    });

    it("centers the bar on the resize handle's line: (hit size / 2) inside the column edge", () => {
      // The handle's line is centered in a hit area that ends at the column's right edge: hit / 2 from the edge.
      const handleLineFromEdge = px("--dm-column-separator-hit-size") / 2;
      // The bar is positioned with its left edge at (edge + margin-left); its center is margin-left + width / 2.
      const marginLeft = evalCalc(placeholder["margin-left"]);
      const barCenterFromEdge = marginLeft + px("--dm-column-separator-line-width-active") / 2;

      expect(barCenterFromEdge).toBe(-handleLineFromEdge);
    });

    it("keeps that relationship if the shared sizes change (formula, not magic numbers)", () => {
      expect(placeholder["margin-left"]).toBe(
        "calc(-1 * (var(--dm-column-separator-hit-size) / 2 + var(--dm-column-separator-line-width-active) / 2))",
      );
    });

    it("centers the very first gap, which has no handle in front of it, on the edge itself", () => {
      const marginLeft = evalCalc(firstGap["margin-left"]);

      expect(marginLeft + px("--dm-column-separator-line-width-active") / 2).toBe(0);
    });

    it("is drawn above the resize handles", () => {
      const handleZ = Number(declarationsOf(blockOf(blockOf(resizerCss, ".root"), ".handle"))["z-index"]);

      expect(Number(placeholder["z-index"])).toBeGreaterThan(handleZ);
    });
  });

  describe("resize handle marker", () => {
    it("renders data-resizer-handle on the handle, which the column drag uses to ignore it", () => {
      const { container } = render(
        <Resizer variant="column" initialWidth={100}>
          <span>Column</span>
        </Resizer>,
      );
      const handles = container.querySelectorAll("[data-resizer-handle]");

      expect(handles).toHaveLength(1);
      expect(handles[0].parentElement.querySelector("span")?.textContent).toBe("Column");
    });
  });
});
