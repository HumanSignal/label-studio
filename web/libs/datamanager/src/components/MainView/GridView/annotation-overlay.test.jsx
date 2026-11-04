import { describe, expect, it } from "bun:test";
import { encode } from "@thi.ng/rle-pack";
import { getImageLabels, selectPreviewAnnotation, decodeBrushMask } from "./annotation-overlay";

describe("annotation grid data", () => {
  it("selects the newest submitted annotation without mixing cancelled annotations", () => {
    expect(
      selectPreviewAnnotation([
        { id: 4, was_cancelled: true, result: [] },
        { id: 1, result: [{ id: "old" }] },
        { id: 3, result: [] },
      ])?.id,
    ).toBe(3);
    expect(selectPreviewAnnotation([{ id: 5, was_cancelled: true }])).toBeNull();
  });

  it("resolves matching image fields and control-specific label colors", () => {
    const labels = getImageLabels(
      '<View><Image name="front" value="$image"/><Image name="back" value="$other"/><BrushLabels name="defects" toName="front"><Label value="scratch" background="#ff0000"/></BrushLabels><PolygonLabels name="outline" toName="front"><Label value="scratch" background="#00ff00"/></PolygonLabels></View>',
      "image",
    );
    expect(labels.imageNames).toEqual(["front"]);
    expect(labels.colors["defects:scratch"]).toBe("#ff0000");
    expect(labels.colors["outline:scratch"]).toBe("#00ff00");
  });

  it("uses brush alpha and rejects inconsistent dimensions", () => {
    const rle = Array.from(encode(new Uint8Array([0, 0, 0, 255, 255, 255, 255, 0]), 8));
    expect(Array.from(decodeBrushMask(rle, 2, 1, "#ff0000"))).toEqual([255, 0, 0, 255, 255, 0, 0, 0]);
    expect(() => decodeBrushMask(rle, 3, 1, "#ff0000")).toThrow();
  });
});
