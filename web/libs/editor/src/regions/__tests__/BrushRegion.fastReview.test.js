import { getBrushBBoxFromMeta, shouldUseFastStaticBrushReview } from "../BrushRegion";

describe("BrushRegion AI review fast mode", () => {
  it("uses ML-provided bbox metadata without reading canvas imageData", () => {
    expect(
      getBrushBBoxFromMeta(
        { x: 10, y: 20, width: 30, height: 40 },
        { naturalWidth: 100, naturalHeight: 200, stageWidth: 50, stageHeight: 100 },
      ),
    ).toEqual({ left: 5, top: 10, right: 20, bottom: 30 });
  });

  it("does not use static rendering while brush geometry can be edited", () => {
    const store = { aiReviewFastMode: true, annotationStore: { selected: { isLinkingMode: false } } };
    const baseItem = { selected: false, highlighted: false, isDrawing: false };

    expect(shouldUseFastStaticBrushReview({ store, suggestion: false, item: baseItem })).toBe(true);
    expect(shouldUseFastStaticBrushReview({ store, suggestion: false, item: { ...baseItem, selected: true } })).toBe(
      false,
    );
    expect(shouldUseFastStaticBrushReview({ store, suggestion: false, item: { ...baseItem, isDrawing: true } })).toBe(
      false,
    );
  });
});
