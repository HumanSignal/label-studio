import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { Tooltip } from "./Tooltip";

const VIEWPORT_WIDTH = 1024;
const TOOLTIP_WIDTH = 60;
const TOOLTIP_HEIGHT = 32;
// The `_align_*-right` classes add a CSS margin-left (pointer offset) that the inline `left` does not include.
const ALIGN_MARGIN = 4;

const rect = (left: number, top: number, width: number, height: number) =>
  ({
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  }) as DOMRect;

describe("Tooltip", () => {
  let clientWidth: PropertyDescriptor | undefined;
  let rectSpy: ReturnType<typeof spyOn> | undefined;

  beforeEach(() => {
    clientWidth = Object.getOwnPropertyDescriptor(document.documentElement, "clientWidth");
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: VIEWPORT_WIDTH });

    // The trigger is an icon button flush with the viewport's right edge (the Outliner's Hide/Show eye). The
    // tooltip is measured where its inline `left` plus the alignment margin puts it, as a browser would.
    rectSpy = spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.dataset.testid === "tooltip") {
        const left = (Number.parseFloat(this.style.left) || 0) + ALIGN_MARGIN;
        return rect(left, Number.parseFloat(this.style.top) || 0, TOOLTIP_WIDTH, TOOLTIP_HEIGHT);
      }
      return rect(VIEWPORT_WIDTH - 16, 400, 16, 16);
    });
  });

  afterEach(() => {
    rectSpy?.mockRestore();
    if (clientWidth) Object.defineProperty(document.documentElement, "clientWidth", clientWidth);
    else delete (document.documentElement as { clientWidth?: number }).clientWidth;
  });

  // FIT-3180: a tooltip near the right edge was squeezed by the viewport and wrapped one letter per line.
  it("keeps a tooltip for an edge-of-viewport trigger inside the viewport at its full width", async () => {
    render(
      <Tooltip title="Hide">
        <button type="button" aria-label="Hide region" />
      </Tooltip>,
    );

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Hide region" }));

    const tooltip = await screen.findByTestId("tooltip");
    await waitFor(() => expect(tooltip.style.left).not.toBe(""));
    await waitFor(() => {
      const box = tooltip.getBoundingClientRect();
      expect(box.right).toBeLessThanOrEqual(VIEWPORT_WIDTH);
      expect(box.left).toBeGreaterThanOrEqual(0);
    });
    expect(screen.getByTestId("tooltip-body").textContent).toBe("Hide");
  });

  // Layout is not computed by jsdom and CSS modules are stubbed, so guard the stylesheet rule that stops the
  // absolutely positioned box from shrinking to the space left before the viewport edge.
  it("sizes the tooltip to its content instead of the space left before the viewport edge", () => {
    const css = readFileSync(path.join(import.meta.dir, "Tooltip.module.css"), "utf8");
    const tooltipRule = css.match(/^\.tooltip\s*\{([^}]*)/m)?.[1] ?? "";

    expect(tooltipRule).toMatch(/\bwidth:\s*max-content;/);
    expect(tooltipRule).toMatch(/\bmax-width:\s*\d+px;/);
  });
});
