import { ImageView, LabelStudio, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import {
  simpleImageData,
  simpleRectangleConfig,
  simpleRectangleResult,
} from "../../data/image_segmentation/tools/selection-tool";

describe("Image Segmentation - Transformer interactions", () => {
  it("moves a selected rectangle in move mode and updates serialized coordinates", () => {
    LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(simpleRectangleResult).init();
    ImageView.waitForImage();

    ImageView.selectMoveToolByButton();
    ImageView.clickAtRelative(0.5, 0.5);
    Sidebar.hasSelectedRegions(1);

    LabelStudio.serialize().then((beforeResult) => {
      const before = beforeResult.find((r) => r.type === "rectangle");
      expect(before).to.exist;

      // Dragging inside a selected region in move mode should move that region.
      ImageView.drawRectRelative(0.5, 0.5, 0.1, 0.08);

      LabelStudio.serialize().then((afterResult) => {
        const after = afterResult.find((r) => r.type === "rectangle");
        expect(after).to.exist;
        expect(after?.value.x).to.not.equal(before?.value.x);
        expect(after?.value.y).to.not.equal(before?.value.y);
      });
    });
  });
});
