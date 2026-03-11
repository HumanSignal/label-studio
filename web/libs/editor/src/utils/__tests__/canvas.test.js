/* global describe, test, expect, jest, beforeEach */
import { encode as rleEncode } from "@thi.ng/rle-pack";
import Canvas from "../canvas";

jest.mock("../feature-flags", () => ({
  FF_LSDV_4583: "fflag_feat_front_lsdv_4583_multi_image_segmentation_short",
  isFF: jest.fn(() => false),
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
  test("returns Image with data URL from RLE-encoded item", () => {
    const nw = 2;
    const nh = 2;
    const raw = new Uint8Array(nw * nh * 4);
    raw[3] = 255;
    raw[7] = 255;
    const rle = rleEncode(raw, raw.length);
    const imageData = { data: new Uint8ClampedArray(nw * nh * 4) };
    const putImageData = jest.fn();
    const toDataURL = jest.fn().mockReturnValue("data:image/png;base64,rle2region");
    const canvas = {
      width: nw,
      height: nh,
      getContext: () => ({
        createImageData: () => imageData,
        putImageData,
        getImageData: () => imageData,
      }),
      toDataURL,
    };
    const origCreateElement = document.createElement.bind(document);
    jest
      .spyOn(document, "createElement")
      .mockImplementation((tag) => (tag === "canvas" ? canvas : origCreateElement(tag)));

    const item = {
      rle,
      currentImageEntity: { naturalWidth: nw, naturalHeight: nh },
    };
    const result = Canvas.RLE2Region(item, { color: "#ff0000" });

    expect(result).toBeInstanceOf(Image);
    expect(result.src).toBe("data:image/png;base64,rle2region");
    expect(putImageData).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  test("accepts custom color option", () => {
    const nw = 2;
    const nh = 2;
    const raw = new Uint8Array(16);
    raw[3] = 255;
    const rle = rleEncode(raw, raw.length);
    const imageData = { data: new Uint8ClampedArray(16) };
    const canvas = {
      width: nw,
      height: nh,
      getContext: () => ({
        createImageData: () => imageData,
        putImageData: jest.fn(),
        getImageData: () => imageData,
      }),
      toDataURL: () => "data:image/png;base64,default",
    };
    const origCreateElement = document.createElement.bind(document);
    jest
      .spyOn(document, "createElement")
      .mockImplementation((tag) => (tag === "canvas" ? canvas : origCreateElement(tag)));

    const item = {
      rle,
      currentImageEntity: { naturalWidth: nw, naturalHeight: nh },
    };
    const result = Canvas.RLE2Region(item, { color: "#888" });

    expect(result).toBeInstanceOf(Image);
    expect(result.src).toBe("data:image/png;base64,default");
    jest.restoreAllMocks();
  });
});

const realCreateElement = document.createElement.bind(document);

function createExportRLECanvas(nw, nh) {
  const canvas = realCreateElement("canvas");
  canvas.width = nw;
  canvas.height = nh;
  if (!canvas.style) canvas.style = {};
  if (typeof canvas.style.setProperty !== "function") {
    canvas.style.setProperty = jest.fn();
  }
  const imageData = { data: new Uint8ClampedArray(nw * nh * 4) };
  canvas.getContext = () => ({
    createImageData: () => ({ data: new Uint8ClampedArray(nw * nh * 4) }),
    putImageData: jest.fn(),
    drawImage: jest.fn(),
    getImageData: () => imageData,
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
  });
  return canvas;
}

describe("Region2RLE", () => {
  beforeEach(() => {
    const { isFF } = require("../feature-flags");
    isFF.mockReturnValue(false);
  });

  test("returns RLE when isFF(FF_LSDV_4583) is true (exportRLE path)", () => {
    const { isFF } = require("../feature-flags");
    isFF.mockImplementation((id) => id === "fflag_feat_front_lsdv_4583_multi_image_segmentation_short");
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "canvas") return createExportRLECanvas(4, 4);
      return origCreateElement(tag);
    });
    const region = {
      currentImageEntity: { naturalWidth: 4, naturalHeight: 4 },
      rle: null,
      touches: [],
    };
    const result = Canvas.Region2RLE(region);
    expect(result).toBeDefined();
    expect(Array.isArray(result) || typeof result === "string" || ArrayBuffer.isView(result)).toBe(true);
    jest.restoreAllMocks();
  });

  test("exportRLE path with existing region.rle applies decode and putImageData", () => {
    const { isFF } = require("../feature-flags");
    isFF.mockImplementation((id) => id === "fflag_feat_front_lsdv_4583_multi_image_segmentation_short");
    const nw = 4;
    const nh = 4;
    const raw = new Uint8Array(nw * nh * 4);
    raw[15] = 255;
    const rle = rleEncode(raw, raw.length);
    const putImageData = jest.fn();
    const imageDataForGet = { data: new Uint8ClampedArray(nw * nh * 4) };
    const realCanvas = createExportRLECanvas(nw, nh);
    realCanvas.getContext = () => ({
      createImageData: () => ({ data: new Uint8ClampedArray(nw * nh * 4) }),
      putImageData,
      drawImage: jest.fn(),
      getImageData: () => imageDataForGet,
    });
    const origCreateElement = document.createElement.bind(document);
    jest
      .spyOn(document, "createElement")
      .mockImplementation((tag) => (tag === "canvas" ? realCanvas : origCreateElement(tag)));

    const region = {
      currentImageEntity: { naturalWidth: nw, naturalHeight: nh },
      rle,
      touches: [],
    };
    const result = Canvas.Region2RLE(region);

    expect(result).toBeDefined();
    expect(putImageData).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  test("exportRLE path with getMaskImage draws mask on canvas", () => {
    const { isFF } = require("../feature-flags");
    isFF.mockImplementation((id) => id === "fflag_feat_front_lsdv_4583_multi_image_segmentation_short");
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "canvas") return createExportRLECanvas(4, 4);
      return origCreateElement(tag);
    });
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = 4;
    maskCanvas.height = 4;
    const region = {
      currentImageEntity: { naturalWidth: 4, naturalHeight: 4 },
      rle: null,
      touches: [],
      getMaskImage: () => maskCanvas,
    };
    const result = Canvas.Region2RLE(region);
    expect(result).toBeDefined();
    jest.restoreAllMocks();
  });

  test("exportRLE path with touches renders strokes and encodes", () => {
    const { isFF } = require("../feature-flags");
    isFF.mockImplementation((id) => id === "fflag_feat_front_lsdv_4583_multi_image_segmentation_short");
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "canvas") return createExportRLECanvas(10, 10);
      return origCreateElement(tag);
    });
    const region = {
      currentImageEntity: { naturalWidth: 10, naturalHeight: 10 },
      rle: null,
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
    jest.restoreAllMocks();
  });

  test("legacy path returns undefined when stage is missing", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const region = {
      currentImageEntity: { naturalWidth: 4, naturalHeight: 4 },
      object: {},
      cleanId: "area-1",
    };
    const result = Canvas.Region2RLE(region);
    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith("Stage not found for area #area-1");
    consoleSpy.mockRestore();
  });

  test("legacy path returns [] when layer not found on stage", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const region = {
      currentImageEntity: { naturalWidth: 4, naturalHeight: 4 },
      id: "layer-1",
      cleanId: "layer-1",
      object: {
        stageRef: {
          findOne: () => null,
        },
      },
    };
    const result = Canvas.Region2RLE(region);
    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith("Layer #layer-1 was not found on Stage");
    consoleSpy.mockRestore();
  });
});
