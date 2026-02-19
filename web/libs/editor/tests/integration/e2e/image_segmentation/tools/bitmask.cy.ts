import { ImageView, LabelStudio, Labels, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import { bitmaskConfig, bitmaskImageData } from "../../../data/image_segmentation/tools/bitmask";

describe("Image segmentation - Tools - Bitmask", () => {
  const selectBitmaskTool = () => {
    ImageView.toolBar.find('[aria-label="bitmask-tool"]').should("be.visible").click().should("have.class", "lsf-tool_active");
  };

  const selectEraserTool = () => {
    ImageView.toolBar.find('[aria-label="eraser"]').should("be.visible").click();
  };

  it("creates a bitmask region with serializable pixel payload", () => {
    LabelStudio.params().config(bitmaskConfig).data(bitmaskImageData).withResult([]).init();
    LabelStudio.waitForObjectsReady();
    ImageView.waitForImage();

    selectBitmaskTool();
    Labels.select("Test");

    ImageView.drawRectRelative(0.2, 0.2, 0.2, 0.2);
    Sidebar.hasRegions(1);

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
      const payload = result[0].value;
      const hasImageData = typeof payload.imageDataURL === "string" && payload.imageDataURL.startsWith("data:image/png;base64,");
      const hasRle = Array.isArray(payload.rle) && payload.rle.length > 0;

      expect(hasImageData || hasRle).to.equal(true);
    });
  });

  it("supports erasing part of a bitmask without creating a second region", () => {
    LabelStudio.params().config(bitmaskConfig).data(bitmaskImageData).withResult([]).init();
    LabelStudio.waitForObjectsReady();
    ImageView.waitForImage();

    selectBitmaskTool();
    Labels.select("Test");
    ImageView.drawRectRelative(0.2, 0.2, 0.3, 0.3);
    Sidebar.hasRegions(1);

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
      const before = result[0].value.imageDataURL ?? JSON.stringify(result[0].value.rle ?? []);

      selectEraserTool();
      ImageView.drawRectRelative(0.3, 0.3, 0.15, 0.15);
      Sidebar.hasRegions(1);

      LabelStudio.serialize().then((updated) => {
        expect(updated).to.have.length(1);
        const after = updated[0].value.imageDataURL ?? JSON.stringify(updated[0].value.rle ?? []);
        expect(after).to.not.equal(before);
      });
    });
  });
});
