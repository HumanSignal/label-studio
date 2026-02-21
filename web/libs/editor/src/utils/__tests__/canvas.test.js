/* global describe, test, expect */
import Canvas from "../canvas";

const svgs = {
  simple: [
    "'data:image/svg+xml,",
    '%3Csvg xmlns="http://www.w3.org/2000/svg" height="16" width="2"%3E',
    '%3Ctext x="0" y="11" style="font-size: 9.5px; font-weight: bold; font-family: var(--font-mono);"%3E',
    "Test Label",
    "%3C/text%3E%3C/svg%3E'",
  ].join(""),
  complex: [
    "'data:image/svg+xml,",
    '%3Csvg xmlns="http://www.w3.org/2000/svg" height="16" width="2"%3E',
    '%3Ctext x="0" y="11" style="font-size: 9.5px; font-weight: bold; font-family: var(--font-mono);"%3E',
    "A&lt;/text%3E B",
    "%3C/text%3E%3C/svg%3E'",
  ].join(""),
  score: [
    "'data:image/svg+xml,",
    '%3Csvg xmlns="http://www.w3.org/2000/svg" height="16" width="28"%3E',
    '%3Crect x="0" y="0" rx="2" ry="2" width="24" height="14" style="fill:%237ca91f;opacity:0.5" /%3E',
    '%3Ctext x="3" y="10" style="font-size: 8px; font-family: var(--font-mono);"%3E0.60%3C/text%3E',
    '%3Ctext x="26" y="11" style="font-size: 9.5px; font-weight: bold; font-family: var(--font-mono);"%3E',
    "Test Label",
    "%3C/text%3E%3C/svg%3E'",
  ].join(""),
  empty: [
    "'data:image/svg+xml,",
    '%3Csvg xmlns="http://www.w3.org/2000/svg" height="16" width="0"%3E',
    "%3C/svg%3E'",
  ].join(""),
};

describe("Helper function labelToSVG", () => {
  test("Simple label", () => {
    expect(Canvas.labelToSVG({ label: "Test Label" })).toBe(svgs.simple);
  });

  test("Complex label", () => {
    // labels will be already escaped
    expect(Canvas.labelToSVG({ label: "A&lt;/text>   B" })).toBe(svgs.complex);
  });

  test("With score", () => {
    expect(Canvas.labelToSVG({ label: "Test Label", score: 0.6 })).toBe(svgs.score);
  });

  test("No label & score", () => {
    expect(Canvas.labelToSVG({})).toBe(svgs.empty);
  });

  test("label with score null uses cache key without score", () => {
    const out1 = Canvas.labelToSVG({ label: "L", score: null });
    const out2 = Canvas.labelToSVG({ label: "L", score: null });
    expect(out1).toBe(out2);
  });
});

describe("createBrushSizeCircleCursor", () => {
  test("returns cursor CSS string with data URL and hotspot", () => {
    const result = Canvas.createBrushSizeCircleCursor(24);
    expect(result).toMatch(/^url\('/);
    expect(result).toContain(",");
    expect(result).toContain("auto");
  });
});

describe("trim", () => {
  test("returns bbox and canvas from canvas with opaque pixels", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(1,1,1,1)";
    ctx.fillRect(2, 2, 4, 4);
    const result = Canvas.trim(canvas);
    expect(result).toHaveProperty("bbox");
    expect(result.bbox).toHaveProperty("width");
    expect(result.bbox).toHaveProperty("height");
    expect(result).toHaveProperty("canvas");
  });

  test("returns canvas and bbox when canvas is fully transparent", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 10;
    canvas.height = 10;
    const result = Canvas.trim(canvas);
    expect(result).toHaveProperty("bbox");
    expect(result).toHaveProperty("canvas");
    expect(result.canvas).toBe(canvas);
  });

  test("returns fallback when getImageData throws (catch branch)", () => {
    const fakeCanvas = {
      width: 10,
      height: 10,
      getContext: () => ({
        getImageData: () => {
          throw new Error("mock throw");
        },
      }),
    };
    const result = Canvas.trim(fakeCanvas);
    expect(result).toHaveProperty("bbox");
    expect(result).toHaveProperty("canvas");
    expect(result.canvas).toBeTruthy();
  });
});

describe("mask2DataURL", () => {
  test("returns data URL from single-channel mask (mocked canvas.toDataURL)", () => {
    const singleChannel = new Uint8ClampedArray(4);
    singleChannel[0] = 255;
    singleChannel[3] = 255;
    const putImageData = jest.fn();
    const getImageData = jest.fn().mockReturnValue({
      data: new Uint8ClampedArray(16),
    });
    const toDataURL = jest.fn().mockReturnValue("data:image/png;base64,stub");
    const canvas = {
      width: 2,
      height: 2,
      getContext: () => ({
        getImageData,
        putImageData,
      }),
      toDataURL,
    };
    const origCreateElement = document.createElement.bind(document);
    jest
      .spyOn(document, "createElement")
      .mockImplementation((tag) => (tag === "canvas" ? canvas : origCreateElement(tag)));

    const url = Canvas.mask2DataURL(singleChannel, 2, 2, "#ff0000");

    expect(toDataURL).toHaveBeenCalled();
    expect(url).toBe("data:image/png;base64,stub");
    expect(putImageData).toHaveBeenCalled();

    jest.restoreAllMocks();
  });
});

describe("maskDataURL2Image", () => {
  test("resolves with image after processing mask data URL (mocked canvas/img)", async () => {
    const putImageData = jest.fn();
    const getImageData = jest.fn().mockReturnValue({
      data: new Uint8ClampedArray(16),
    });
    const toDataURL = jest.fn().mockReturnValue("data:image/png;base64,out");
    const canvasStub = {
      width: 2,
      height: 2,
      getContext: () => ({
        getImageData,
        putImageData,
        drawImage: jest.fn(),
      }),
      toDataURL,
    };
    let storedOnload;
    const imgStub = {
      set onload(fn) {
        storedOnload = fn;
      },
      set src(_value) {
        if (storedOnload) setTimeout(storedOnload, 0);
      },
      width: 2,
      height: 2,
    };
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "canvas") return canvasStub;
      if (tag === "img") return imgStub;
      return origCreateElement(tag);
    });

    const result = await Canvas.maskDataURL2Image("data:image/png;base64,stub", { color: "#00ff00" });

    expect(result).toBe(imgStub);
    expect(putImageData).toHaveBeenCalled();
    expect(toDataURL).toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});
