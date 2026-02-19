import { Hotkeys, ImageView, LabelStudio, Labels, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import { magicWandConfig, magicWandData } from "../../../data/image_segmentation/tools/magicwand";

describe("Image segmentation - Tools - MagicWand", () => {
  const selectMagicWandTool = () => {
    ImageView.toolBar.find('[aria-label="magicwand"]').should("be.visible").click().should("have.class", "lsf-tool_active");
  };

  it("creates a labeled magic-wand region and serializes mask payload", () => {
    LabelStudio.params().config(magicWandConfig).data(magicWandData).withResult([]).init();
    LabelStudio.waitForObjectsReady();
    ImageView.waitForImage();

    selectMagicWandTool();
    Labels.select("Cloud");
    ImageView.clickAtRelative(0.35, 0.15);

    Sidebar.hasRegions(1);

    LabelStudio.serialize().then((result) => {
      const regionPayload = result.find((entry) => Array.isArray(entry.value.rle));
      const labelsPayload = result.find((entry) => Array.isArray(entry.value.labels));

      expect(regionPayload).to.exist;
      expect(labelsPayload).to.exist;
      expect(labelsPayload?.value.labels).to.deep.equal(["Cloud"]);
      expect(Array.isArray(regionPayload?.value.rle)).to.equal(true);
      expect(regionPayload?.value.rle.length ?? 0).to.be.greaterThan(0);
    });
  });

  it("supports undo and redo after magic-wand region creation", () => {
    LabelStudio.params().config(magicWandConfig).data(magicWandData).withResult([]).init();
    LabelStudio.waitForObjectsReady();
    ImageView.waitForImage();

    selectMagicWandTool();
    Labels.select("Cloud");
    ImageView.clickAtRelative(0.35, 0.15);
    Sidebar.hasRegions(1);

    Hotkeys.undo();
    Sidebar.hasRegions(0);

    Hotkeys.redo();
    Sidebar.hasRegions(1);
  });

  it("keeps magic-wand tool stable when clicking already active tool button", () => {
    LabelStudio.params().config(magicWandConfig).data(magicWandData).withResult([]).init();
    LabelStudio.waitForObjectsReady();
    ImageView.waitForImage();

    selectMagicWandTool();
    ImageView.toolBar.find('[aria-label="magicwand"]').click().should("have.class", "lsf-tool_active");

    Labels.select("Shadow");
    ImageView.clickAtRelative(0.45, 0.2);
    Sidebar.hasRegions(1);

    LabelStudio.serialize().then((result) => {
      const labelsPayload = result.find((entry) => Array.isArray(entry.value.labels));

      expect(labelsPayload).to.exist;
      expect(labelsPayload?.value.labels).to.deep.equal(["Shadow"]);
    });
  });
});
