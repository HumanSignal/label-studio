import { ImageView, LabelStudio, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import {
  simpleImageData,
  simpleRectangleConfig,
  simpleRectangleResult,
} from "../../data/image_segmentation/tools/selection-tool";
import { FF_DEV_2671, FF_ZOOM_OPTIM } from "../../../../src/utils/feature-flags";

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
      expect(region?.value.x ?? 0).to.be.at.least(-0.00001);
      expect(region?.value.y ?? 0).to.be.at.least(-0.00001);
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

  it("reattaches transformer after deselecting and reselecting a region", () => {
    LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(simpleRectangleResult).init();
    ImageView.waitForImage();

    ImageView.selectMoveToolByButton();
    ImageView.clickAtRelative(0.5, 0.5);
    Sidebar.hasSelectedRegions(1);

    ImageView.clickAtRelative(0.05, 0.05);
    Sidebar.hasSelectedRegions(0);

    ImageView.clickAtRelative(0.5, 0.5);
    Sidebar.hasSelectedRegions(1);
  });

  it("keeps transformed rectangle bounded with zoom optimization enabled", () => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_ZOOM_OPTIM]: true,
    });

    LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(simpleRectangleResult).init();
    ImageView.waitForImage();

    cy.get('button[aria-label="zoom-in"]').click().click().click();

    ImageView.selectMoveToolByButton();
    ImageView.clickAtRelative(0.5, 0.5);
    Sidebar.hasSelectedRegions(1);
    ImageView.drawRectRelative(0.65, 0.65, 0.2, 0.2);

    LabelStudio.serialize().then((result) => {
      const region = result.find((r) => r.type === "rectangle");

      expect(region).to.exist;
      expect((region?.value.x ?? 0) + (region?.value.width ?? 0)).to.be.at.most(100);
      expect((region?.value.y ?? 0) + (region?.value.height ?? 0)).to.be.at.most(100);
      expect(region?.value.x ?? 0).to.be.at.least(-0.00001);
      expect(region?.value.y ?? 0).to.be.at.least(-0.00001);
    });
  });

  it("keeps dragged rectangle constrained when crossing each stage border", () => {
    LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(simpleRectangleResult).init();
    ImageView.waitForImage();

    ImageView.selectMoveToolByButton();
    ImageView.clickAtRelative(0.5, 0.5);
    Sidebar.hasSelectedRegions(1);

    ImageView.drawRectRelative(0.5, 0.5, -0.45, 0, { force: true });
    LabelStudio.serialize().then((result) => {
      const region = result.find((r) => r.type === "rectangle");

      expect(region).to.exist;
      expect(region?.value.x ?? 0).to.be.at.least(-0.00001);
    });

    ImageView.drawRectRelative(0.25, 0.5, 0, -0.45, { force: true });
    LabelStudio.serialize().then((result) => {
      const region = result.find((r) => r.type === "rectangle");

      expect(region).to.exist;
      expect(region?.value.y ?? 0).to.be.at.least(-0.00001);
    });

    ImageView.drawRectRelative(0.25, 0.25, 0.7, 0, { force: true });
    ImageView.drawRectRelative(0.8, 0.25, 0, 0.7, { force: true });
    LabelStudio.serialize().then((result) => {
      const region = result.find((r) => r.type === "rectangle");

      expect(region).to.exist;
      expect((region?.value.x ?? 0) + (region?.value.width ?? 0)).to.be.at.most(100);
      expect((region?.value.y ?? 0) + (region?.value.height ?? 0)).to.be.at.most(100);
    });
  });

  it("clamps transformer resize anchors to image bounds deterministically", () => {
    LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(simpleRectangleResult).init();
    ImageView.waitForImage();

    ImageView.selectMoveToolByButton();
    ImageView.clickAtRelative(0.5, 0.5);
    Sidebar.hasSelectedRegions(1);

    // Drag top and left resize anchors beyond bounds; transformer should clamp box to stage.
    ImageView.drawRectRelative(0.5, 0.2, 0, -0.15, { force: true });
    ImageView.drawRectRelative(0.2, 0.5, -0.15, 0, { force: true });

    LabelStudio.serialize().then((result) => {
      const region = result.find((r) => r.type === "rectangle");

      expect(region).to.exist;
      expect(region?.value.x ?? 0).to.be.at.least(-0.00001);
      expect(region?.value.y ?? 0).to.be.at.least(-0.00001);
      expect(region?.value.width ?? 0).to.be.greaterThan(0);
      expect(region?.value.height ?? 0).to.be.greaterThan(0);
    });
  });
});
