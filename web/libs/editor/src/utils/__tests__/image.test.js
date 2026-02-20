import { mapKonvaBrightness, reverseCoordinates, fixRectToFit } from "../image";

describe("mapKonvaBrightness", () => {
  describe("linear range (0% - 100%)", () => {
    it.each([
      [0, -1],
      [25, -0.75],
      [50, -0.5],
      [75, -0.25],
      [100, 0],
    ])("maps %d%% brightness to %f", (input, expected) => {
      expect(mapKonvaBrightness(input)).toBeCloseTo(expected, 4);
    });
  });

  describe("non-linear range (100% - 400%)", () => {
    it.each([
      [150, Math.sqrt(50 / 300) * 0.8],
      [200, Math.sqrt(100 / 300) * 0.8],
      [250, Math.sqrt(150 / 300) * 0.8],
      [300, Math.sqrt(200 / 300) * 0.8],
      [350, Math.sqrt(250 / 300) * 0.8],
      [400, Math.sqrt(300 / 300) * 0.8], // = 0.8
    ])("maps %d%% brightness correctly", (input, expected) => {
      expect(mapKonvaBrightness(input)).toBeCloseTo(expected, 4);
    });
  });

  describe("general characteristics", () => {
    it("returns a finite number for a wide range of inputs", () => {
      for (let i = 0; i <= 400; i += 10) {
        const result = mapKonvaBrightness(i);
        expect(typeof result).toBe("number");
        expect(Number.isFinite(result)).toBe(true);
      }
    });

    it("returns 0 at exactly 100%", () => {
      expect(mapKonvaBrightness(100)).toBe(0);
    });

    it("returns maximum value 0.8 at 400%", () => {
      expect(mapKonvaBrightness(400)).toBeCloseTo(0.8, 4);
    });
  });
});

describe("reverseCoordinates", () => {
  it("normalizes so x1 <= x2 and y1 <= y2", () => {
    const r = reverseCoordinates({ x: 10, y: 20 }, { x: 5, y: 15 });
    expect(r.x1).toBe(5);
    expect(r.y1).toBe(15);
    expect(r.x2).toBe(10);
    expect(r.y2).toBe(20);
  });
  it("swaps when first point is right/below second", () => {
    const r = reverseCoordinates({ x: 5, y: 15 }, { x: 10, y: 20 });
    expect(r.x1).toBe(5);
    expect(r.y1).toBe(15);
    expect(r.x2).toBe(10);
    expect(r.y2).toBe(20);
  });
});

describe("fixRectToFit", () => {
  it("clips rect that extends past stage right/bottom", () => {
    const rect = { x: 0, y: 0, width: 150, height: 120 };
    const result = fixRectToFit(rect, 100, 100);
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
  });
  it("clips rect with negative x/y", () => {
    const rect = { x: -10, y: -5, width: 50, height: 50 };
    const result = fixRectToFit(rect, 100, 100);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.width).toBe(40);
    expect(result.height).toBe(45);
  });
  it("returns rect unchanged when already inside", () => {
    const rect = { x: 10, y: 10, width: 50, height: 50 };
    const result = fixRectToFit(rect, 100, 100);
    expect(result).toEqual({ ...rect, x: 10, y: 10, width: 50, height: 50 });
  });
});
