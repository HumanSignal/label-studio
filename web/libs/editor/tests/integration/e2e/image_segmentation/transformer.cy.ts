import { ImageView, LabelStudio, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import {
  simpleImageData,
  simpleRectangleConfig,
  simpleRectangleResult,
} from "../../data/image_segmentation/tools/selection-tool";
import { FF_DEV_2671 } from "../../../../src/utils/feature-flags";

describe("Image Segmentation - Transformer interactions", () => {
  it("keeps rectangle coordinates within image bounds when dragging near edges", () => {
    LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(simpleRectangleResult).init();
    ImageView.waitForImage();

    ImageView.selectMoveToolByButton();
    ImageView.clickAtRelative(0.5, 0.5);
    Sidebar.hasSelectedRegions(1);

    ImageView.drawRectRelative(0.6, 0.6, 0.2, 0.2);

    LabelStudio.serialize().then((result) => {
      const region = result.find((r) => r.type === "rectangle");

      expect(region).to.exist;
      expect((region?.value.x ?? 0) + (region?.value.width ?? 0)).to.be.at.most(100);
      expect((region?.value.y ?? 0) + (region?.value.height ?? 0)).to.be.at.most(100);
      expect(region?.value.x ?? 0).to.be.at.least(0);
      expect(region?.value.y ?? 0).to.be.at.least(0);
    });
  });

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

  it("moves a selected rectangle with FF_DEV_2671 enabled", () => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_DEV_2671]: true,
    });

    LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(simpleRectangleResult).init();
    ImageView.waitForImage();

    ImageView.selectMoveToolByButton();
    ImageView.clickAtRelative(0.5, 0.5);
    Sidebar.hasSelectedRegions(1);

    LabelStudio.serialize().then((beforeResult) => {
      const before = beforeResult.find((r) => r.type === "rectangle");

      expect(before).to.exist;
      ImageView.drawRectRelative(0.5, 0.5, -0.08, 0.06);

      LabelStudio.serialize().then((afterResult) => {
        const after = afterResult.find((r) => r.type === "rectangle");

        expect(after).to.exist;
        expect(after?.value.x).to.not.equal(before?.value.x);
        expect(after?.value.y).to.not.equal(before?.value.y);
      });
    });
  });
});
