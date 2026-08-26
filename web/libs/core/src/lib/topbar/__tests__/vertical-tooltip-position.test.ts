import { computeVerticalRightTooltipPosition } from "../vertical-tooltip-position";

const viewport = { width: 1000, height: 800 };

describe("computeVerticalRightTooltipPosition", () => {
  it("centers tooltip and arrow on the button when there is room", () => {
    const button = { top: 200, right: 240, bottom: 252, height: 52 };
    const tooltip = { width: 280, height: 160 };

    const result = computeVerticalRightTooltipPosition(button, tooltip, viewport);

    expect(result.top).toBe(200 + 26 - 80);
    expect(result.arrowOffset).toBe(80);
    expect(result.left).toBe(252);
  });

  it("aligns tooltip bottom with button bottom near the viewport bottom", () => {
    const button = { top: 720, right: 240, bottom: 772, height: 52 };
    const tooltip = { width: 280, height: 160 };

    const result = computeVerticalRightTooltipPosition(button, tooltip, viewport);

    expect(result.top).toBe(772 - 160);
    expect(result.arrowOffset).toBe(746 - result.top);
  });

  it("aligns tooltip top with button top near the viewport top", () => {
    const button = { top: 20, right: 240, bottom: 72, height: 52 };
    const tooltip = { width: 280, height: 160 };

    const result = computeVerticalRightTooltipPosition(button, tooltip, viewport);

    expect(result.top).toBe(20);
    expect(result.arrowOffset).toBe(46 - 20);
  });
});
