/* global describe, test, expect, it */
import {
  colorToRGBA,
  colorToRGBAArray,
  contrastColor,
  convertToRGBA,
  getScaleGradient,
  hexToRGBA,
  over,
  removeAlpha,
  rgbArrayToHex,
  rgbaArrayToRGBA,
  rgbaChangeAlpha,
  stringToColor,
} from "../colors";

const defaultRGBA = "rgba(255, 255, 255, 0.1)";
const defaultHEX = {
  short: "#fff",
  long: "#ffffff",
  alpha: 0.1,
};
const randomString = {
  str: "white",
  value: "#29ccbd",
};

describe("Helper function hexToRGBA", () => {
  test("3 dig", () => {
    expect(hexToRGBA(defaultHEX.short, defaultHEX.alpha)).toBe(defaultRGBA);
  });

  test("6 dig", () => {
    expect(hexToRGBA(defaultHEX.long, defaultHEX.alpha)).toBe(defaultRGBA);
  });

  test("accepts opacity argument", () => {
    expect(hexToRGBA("#fff", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
  });
});

describe("Helper function convertToRGBA", () => {
  test("Convert to RGBA, color", () => {
    expect(convertToRGBA(randomString.str, defaultHEX.alpha)).toBe(defaultRGBA);
  });

  test("Convert to RGBA, HEX", () => {
    expect(convertToRGBA(defaultHEX.short, defaultHEX.alpha)).toBe(defaultRGBA);
    expect(convertToRGBA(defaultHEX.long, defaultHEX.alpha)).toBe(defaultRGBA);
  });

  test("uses existing alpha when alpha is not a number", () => {
    expect(convertToRGBA("#fff", undefined)).toBe("rgba(255, 255, 255, 1)");
  });
});

describe("Helper function colorToRGBA", () => {
  test("Good", () => {
    expect(colorToRGBA(randomString.str, defaultHEX.alpha)).toBe(defaultRGBA);
  });

  test("Undefind", () => {
    expect(colorToRGBA(undefined, defaultHEX.alpha)).toBeUndefined();
  });

  test("returns value when not a string", () => {
    const obj = { r: 255, g: 0, b: 0 };
    expect(colorToRGBA(obj)).toBe(obj);
  });

  test("Random string", () => {
    expect(colorToRGBA("RANDOM", defaultHEX.alpha)).toBe("rgba(0, 0, 0, 0.1)");
  });
});

describe("stringToColor", () => {
  it("returns deterministic hex for string", () => {
    expect(stringToColor(randomString.str)).toBe(randomString.value);
  });

  it("returns #000000 for empty string", () => {
    expect(stringToColor("")).toBe("#000000");
  });
});

describe("rgbaChangeAlpha", () => {
  it("replaces alpha in rgba string", () => {
    expect(rgbaChangeAlpha("rgba(1, 2, 3, 0.5)", 0.8)).toBe("rgba(1, 2, 3, 0.8)");
  });
});

describe("getScaleGradient", () => {
  it("returns red for 0", () => {
    expect(getScaleGradient(0)).toBe("#c22525");
  });
  it("returns gradient color for 0.5", () => {
    expect(getScaleGradient(0.5)).toBe("#9ead20");
  });
  it("returns green for 1", () => {
    expect(getScaleGradient(1)).toBe("#1c992d");
  });
});

describe("removeAlpha", () => {
  it("composites with default white base", () => {
    expect(removeAlpha(255, 0, 0, 0.5)).toEqual([255, 128, 128, 1]);
  });
  it("composites with custom base", () => {
    expect(removeAlpha(255, 0, 0, 0.5, [0, 0, 0, 1])).toEqual([128, 0, 0, 1]);
  });
});

describe("contrastColor", () => {
  it("returns black for light background", () => {
    expect(contrastColor("rgba(255, 255, 255, 1)")).toBe("rgb(0,0,0)");
    expect(contrastColor("rgba(240, 240, 240, 0.5)")).toBe("rgb(0,0,0)");
  });
  it("returns white for dark background", () => {
    expect(contrastColor("rgba(0, 0, 0, 1)")).toBe("rgb(255,255,255)");
    expect(contrastColor("rgba(10, 10, 10, 0.8)")).toBe("rgb(255,255,255)");
  });
});

describe("colorToRGBAArray", () => {
  it("parses hex", () => {
    expect(colorToRGBAArray("#fff")).toEqual([255, 255, 255, 1]);
    expect(colorToRGBAArray("#ff0000")).toEqual([255, 0, 0, 1]);
  });
  it("parses rgba string", () => {
    expect(colorToRGBAArray("rgba(100, 150, 200, 0.5)")).toEqual([100, 150, 200, 0.5]);
  });
  it("parses rgb string", () => {
    expect(colorToRGBAArray("rgb(50, 100, 150)")).toEqual([50, 100, 150, 1]);
  });
  it("parses color name", () => {
    expect(colorToRGBAArray("white")).toEqual([255, 255, 255, 1]);
    expect(colorToRGBAArray("red")).toEqual([255, 0, 0, 1]);
  });
  it("returns [0,0,0,1] for falsy or invalid", () => {
    expect(colorToRGBAArray(null)).toEqual([0, 0, 0, 1]);
    expect(colorToRGBAArray(undefined)).toEqual([0, 0, 0, 1]);
    expect(colorToRGBAArray("")).toEqual([0, 0, 0, 1]);
  });
});

describe("rgbArrayToHex", () => {
  it("converts [r,g,b] to hex", () => {
    expect(rgbArrayToHex([255, 255, 255])).toBe("#ffffff");
    expect(rgbArrayToHex([255, 0, 0])).toBe("#ff0000");
  });
});

describe("rgbaArrayToRGBA", () => {
  it("formats rgba array as string", () => {
    expect(rgbaArrayToRGBA([1, 2, 3, 0.5])).toBe("rgba(1, 2, 3, 0.5)");
  });
});

describe("over", () => {
  it("blends color over default white", () => {
    const result = over("rgba(255, 0, 0, 0.5)");
    expect(result.css()).toMatch(/^rgba?\(/);
  });
  it("blends color over custom background", () => {
    const result = over("rgba(255, 0, 0, 0.5)", "black");
    expect(result.css()).toMatch(/^rgba?\(/);
  });
});
