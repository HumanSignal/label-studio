import { ImageView, LabelStudio, Labels, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import { bitmaskConfig, bitmaskImageData } from "../../../data/image_segmentation/tools/bitmask";

describe("Image segmentation - Tools - Bitmask", () => {
  it("creates a bitmask region with serializable pixel payload", () => {
    LabelStudio.params().config(bitmaskConfig).data(bitmaskImageData).withResult([]).init();
    LabelStudio.waitForImageReady();

    ImageView.selectBitmaskToolByButton();
    Labels.select("Test");

    ImageView.drawRectRelative(0.2, 0.2, 0.2, 0.2);
    Sidebar.hasRegions(1);

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
      const payload = result[0].value;
      const hasImageData =
        typeof payload.imageDataURL === "string" && payload.imageDataURL.startsWith("data:image/png;base64,");
      const hasRle = Array.isArray(payload.rle) && payload.rle.length > 0;

      expect(hasImageData || hasRle).to.equal(true);
    });
  });

  it("supports erasing part of a bitmask without creating a second region", () => {
    LabelStudio.params().config(bitmaskConfig).data(bitmaskImageData).withResult([]).init();
    LabelStudio.waitForImageReady();

    ImageView.selectBitmaskToolByButton();
    Labels.select("Test");
    ImageView.drawRectRelative(0.2, 0.2, 0.3, 0.3);
    Sidebar.hasRegions(1);

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
      const before = result[0].value.imageDataURL ?? JSON.stringify(result[0].value.rle ?? []);

      ImageView.selectEraserToolByButton();
      ImageView.drawRectRelative(0.3, 0.3, 0.15, 0.15);
      Sidebar.hasRegions(1);

      LabelStudio.serialize().then((updated) => {
        expect(updated).to.have.length(1);
        const after = updated[0].value.imageDataURL ?? JSON.stringify(updated[0].value.rle ?? []);
        expect(after).to.not.equal(before);
      });
    });
  });

  it("adds multiple bitmask strokes into a single region deterministically", () => {
    LabelStudio.params().config(bitmaskConfig).data(bitmaskImageData).withResult([]).init();
    LabelStudio.waitForImageReady();

    ImageView.selectBitmaskToolByButton();
    Labels.select("Test");
    ImageView.drawRectRelative(0.25, 0.25, 0.12, 0.12);
    Sidebar.hasRegions(1);

    LabelStudio.serialize().then((firstResult) => {
      const before = firstResult[0]?.value.imageDataURL ?? JSON.stringify(firstResult[0]?.value.rle ?? []);

      // Draw another stroke while the same bitmask region is selected.
      ImageView.drawRectRelative(0.5, 0.45, 0.14, 0.1);
      Sidebar.hasRegions(1);

      LabelStudio.serialize().then((secondResult) => {
        const after = secondResult[0]?.value.imageDataURL ?? JSON.stringify(secondResult[0]?.value.rle ?? []);

        expect(secondResult).to.have.length(1);
        expect(after).to.not.equal(before);
      });
    });
  });

  it("applies bitmask size shortcuts while keeping deterministic single-region behavior", () => {
    LabelStudio.params().config(bitmaskConfig).data(bitmaskImageData).withResult([]).init();
    LabelStudio.waitForImageReady();

    ImageView.selectBitmaskToolByButton();
    Labels.select("Test");
    ImageView.drawRectRelative(0.2, 0.2, 0.08, 0.08);
    Sidebar.hasRegions(1);

    LabelStudio.serialize().then((firstResult) => {
      const firstPayload = firstResult[0]?.value.imageDataURL ?? JSON.stringify(firstResult[0]?.value.rle ?? []);

      cy.get("body").type("]");
      ImageView.drawRectRelative(0.35, 0.35, 0.08, 0.08);
      Sidebar.hasRegions(1);

      cy.get("body").type("[");
      ImageView.drawRectRelative(0.5, 0.5, 0.08, 0.08);
      Sidebar.hasRegions(1);

      LabelStudio.serialize().then((finalResult) => {
        const finalPayload = finalResult[0]?.value.imageDataURL ?? JSON.stringify(finalResult[0]?.value.rle ?? []);

        expect(finalResult).to.have.length(1);
        expect(finalPayload).to.not.equal(firstPayload);
      });
    });
  });

  it("keeps bitmask tool active when clicking an already active tool button", () => {
    LabelStudio.params().config(bitmaskConfig).data(bitmaskImageData).withResult([]).init();
    LabelStudio.waitForImageReady();

    ImageView.selectBitmaskToolByButton();
    ImageView.toolBar.find('[aria-label="bitmask-tool"]').click().should("have.class", "lsf-tool_active");

    Labels.select("Test");
    ImageView.drawRectRelative(0.25, 0.25, 0.08, 0.08);
    Sidebar.hasRegions(1);
  });

  describe("Eraser tool", () => {
    it("selects eraser and shows active state", () => {
      LabelStudio.params().config(bitmaskConfig).data(bitmaskImageData).withResult([]).init();
      LabelStudio.waitForImageReady();

      ImageView.selectBitmaskToolByButton();
      Labels.select("Test");
      ImageView.drawRectRelative(0.2, 0.2, 0.2, 0.2);
      Sidebar.hasRegions(1);

      ImageView.selectEraserToolByButton();
      ImageView.toolBar.find('[aria-label="eraser"]').should("have.class", "lsf-tool_active");
    });

    it("eraser size shortcuts then erase modifies region", () => {
      LabelStudio.params().config(bitmaskConfig).data(bitmaskImageData).withResult([]).init();
      LabelStudio.waitForImageReady();

      ImageView.selectBitmaskToolByButton();
      Labels.select("Test");
      ImageView.drawRectRelative(0.2, 0.2, 0.3, 0.3);
      Sidebar.hasRegions(1);

      ImageView.selectEraserToolByButton();
      cy.get("body").type("]");
      cy.get("body").type("[");
      ImageView.drawRectRelative(0.35, 0.35, 0.1, 0.1);
      Sidebar.hasRegions(1);
      LabelStudio.serialize().then((result) => {
        expect(result).to.have.length(1);
        expect(result[0].value).to.exist;
      });
    });
  });
});
