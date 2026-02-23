/* global describe, test, expect, jest */
import { encode as rleEncode } from "@thi.ng/rle-pack";
import Canvas from "../canvas";

jest.mock("../feature-flags", () => ({
  isFF: jest.fn(() => false),
  FF_LSDV_4583: "ff_lsdv_4583",
}));

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

describe("RLE2Region", () => {
  test("returns Image with data URL from RLE item and custom color", () => {
    const toDataURL = jest.fn().mockReturnValue("data:image/png;base64,rle2region");
    const putImageData = jest.fn();
    const newdata = { data: new Uint8ClampedArray(16) };
    newdata.data[3] = 255;
    newdata.data[7] = 255;
    const canvasStub = {
      width: 2,
      height: 2,
      getContext: () => ({
        createImageData: () => ({ data: new Uint8ClampedArray(16) }),
        putImageData,
      }),
      toDataURL,
    };
    const origCreateElement = document.createElement.bind(document);
    jest
      .spyOn(document, "createElement")
      .mockImplementation((tag) => (tag === "canvas" ? canvasStub : origCreateElement(tag)));

    const data = new Uint8Array(16);
    data[3] = 255;
    data[7] = 255;
    const rle = rleEncode(data, data.length);
    const item = {
      rle,
      currentImageEntity: { naturalWidth: 2, naturalHeight: 2 },
    };
    const result = Canvas.RLE2Region(item, { color: "#ff0000" });
    expect(result).toBeInstanceOf(Image);
    expect(result.src).toBe("data:image/png;base64,rle2region");
    expect(putImageData).toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});

describe("Region2RLE", () => {
  const featureFlags = require("../feature-flags");

  beforeEach(() => {
    featureFlags.isFF.mockImplementation(() => false);
  });

  test("returns RLE when FF_LSDV_4583 is on (exportRLE path)", () => {
    featureFlags.isFF.mockImplementation(() => true);
    const region = {
      currentImageEntity: { naturalWidth: 2, naturalHeight: 2 },
      rle: null,
      getMaskImage: undefined,
      touches: [],
    };
    const result = Canvas.Region2RLE(region);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Uint8Array);
  });

  test("returns RLE when FF on and region has existing rle", () => {
    const realCanvas = document.createElement("canvas");
    realCanvas.getContext = jest.fn().mockReturnValue({
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      getImageData: () => ({ data: new Uint8ClampedArray(2 * 2 * 4) }),
      putImageData: jest.fn(),
    });
    const origCreateElement = document.createElement.bind(document);
    jest
      .spyOn(document, "createElement")
      .mockImplementation((tag) => (tag === "canvas" ? realCanvas : origCreateElement(tag)));

    featureFlags.isFF.mockImplementation(() => true);
    const data = new Uint8Array(16);
    data[3] = 255;
    const rle = rleEncode(data, data.length);
    const region = {
      currentImageEntity: { naturalWidth: 2, naturalHeight: 2 },
      rle,
      getMaskImage: undefined,
      touches: [],
    };
    const result = Canvas.Region2RLE(region);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Uint8Array);
    jest.restoreAllMocks();
  });

  test("returns RLE when FF on and region has touches (exportRLE stroke path)", () => {
    const putImageData = jest.fn();
    const stroke = jest.fn();
    const realCanvas = document.createElement("canvas");
    realCanvas.getContext = jest.fn().mockReturnValue({
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      getImageData: () => ({ data: new Uint8ClampedArray(2 * 2 * 4) }),
      putImageData,
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      strokeStyle: "",
      lineWidth: 0,
      lineCap: "",
      lineJoin: "",
      globalCompositeOperation: "",
      stroke,
    });
    const origCreateElement = document.createElement.bind(document);
    jest
      .spyOn(document, "createElement")
      .mockImplementation((tag) => (tag === "canvas" ? realCanvas : origCreateElement(tag)));

    featureFlags.isFF.mockImplementation(() => true);
    const region = {
      currentImageEntity: { naturalWidth: 100, naturalHeight: 50 },
      rle: null,
      getMaskImage: undefined,
      touches: [
        {
          toJSON: () => ({ relativePoints: [0, 0, 50, 50, 100, 0] }),
          relativeStrokeWidth: 10,
          compositeOperation: "source-over",
        },
      ],
    };
    const result = Canvas.Region2RLE(region);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Uint8Array);
    expect(stroke).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  test("returns undefined when FF off and stage missing (legacy path)", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const region = {
      cleanId: "r1",
      currentImageEntity: { naturalWidth: 2, naturalHeight: 2 },
      object: { stageRef: null },
    };
    const result = Canvas.Region2RLE(region);
    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith("Stage not found for area #r1");
    consoleSpy.mockRestore();
  });

  test("returns undefined when FF off and layer not found (legacy path)", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const mockLayer = null;
    const stage = {
      findOne: jest.fn(() => mockLayer),
      getWidth: () => 10,
      getHeight: () => 10,
      getScaleX: () => 1,
      getScaleY: () => 1,
      getX: () => 0,
      getY: () => 0,
      getOffsetX: () => 0,
      getOffsetY: () => 0,
      getRotation: () => 0,
      setWidth: jest.fn().mockReturnThis(),
      setHeight: jest.fn().mockReturnThis(),
      setScaleX: jest.fn().mockReturnThis(),
      setScaleY: jest.fn().mockReturnThis(),
      setX: jest.fn().mockReturnThis(),
      setY: jest.fn().mockReturnThis(),
      setOffsetX: jest.fn().mockReturnThis(),
      setOffsetY: jest.fn().mockReturnThis(),
      setRotation: jest.fn().mockReturnThis(),
      drawScene: jest.fn(),
    };
    const region = {
      id: "r1",
      cleanId: "r1",
      currentImageEntity: { naturalWidth: 2, naturalHeight: 2, stageWidth: 2 },
      object: { stageRef: stage },
      parent: { stageWidth: 2, stageHeight: 2 },
    };
    const result = Canvas.Region2RLE(region);
    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith("Layer #r1 was not found on Stage");
    consoleSpy.mockRestore();
  });
});
