import { Hotkeys, ImageView, LabelStudio, Labels, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import { magicWandConfig, magicWandData } from "../../../data/image_segmentation/tools/magicwand";
import { drawMask } from "../../../../../src/utils/magic-wand";

describe("Image segmentation - Tools - MagicWand", () => {
  const selectMagicWandTool = () => {
    ImageView.toolBar
      .find('[aria-label="magicwand"]')
      .should("be.visible")
      .click()
      .should("have.class", "lsf-tool_active");
  };

  it("creates a labeled magic-wand region and serializes mask payload", () => {
    LabelStudio.params().config(magicWandConfig).data(magicWandData).withResult([]).init();
    LabelStudio.waitForImageReady();

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
    LabelStudio.waitForImageReady();

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
    LabelStudio.waitForImageReady();

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

  it("supports multi-label magic-wand workflow with zoom and region relabeling", () => {
    LabelStudio.params().config(magicWandConfig).data(magicWandData).withResult([]).init();
    LabelStudio.waitForImageReady();

    selectMagicWandTool();
    Labels.select("Cloud");
    ImageView.clickAtRelative(0.35, 0.15);
    Sidebar.hasRegions(1);

    cy.get('button[aria-label="zoom-in"]').click().click().click();
    Hotkeys.unselectAllRegions();
    Labels.select("Shadow");
    ImageView.clickAtRelative(0.78, 0.78);
    cy.get(".lsf-tree__node:not(.lsf-tree__node_type_footer) .lsf-tree-node-content-wrapper")
      .its("length")
      .should("be.gte", 1);

    Sidebar.findRegionByIndex(0).click();
    Labels.select("Shadow");
    cy.get(".lsf-tree__node:not(.lsf-tree__node_type_footer) .lsf-tree-node-content-wrapper")
      .its("length")
      .should("be.gte", 1);

    LabelStudio.serialize().then((result) => {
      const labelEntries = result.filter((entry) => Array.isArray(entry.value.labels));

      expect(labelEntries.length).to.be.greaterThan(0);
      expect(labelEntries.some((entry) => entry.value.labels.includes("Shadow"))).to.equal(true);
    });
  });

  it("creates a fresh magic-wand region after undo without stale cache reuse", () => {
    LabelStudio.params().config(magicWandConfig).data(magicWandData).withResult([]).init();
    LabelStudio.waitForImageReady();

    selectMagicWandTool();
    Labels.select("Cloud");
    ImageView.clickAtRelative(0.3, 0.14);
    Sidebar.hasRegions(1);

    LabelStudio.serialize().then((beforeUndo) => {
      const before = beforeUndo.find((entry) => Array.isArray(entry.value.rle));
      expect(before).to.exist;

      Hotkeys.undo();
      Sidebar.hasRegions(0);

      ImageView.clickAtRelative(0.72, 0.68);
      Sidebar.hasRegions(1);

      LabelStudio.serialize().then((afterRedoPath) => {
        const after = afterRedoPath.find((entry) => Array.isArray(entry.value.rle));
        expect(after).to.exist;
        expect(after?.id).to.not.equal(before?.id);
      });
    });
  });

  it("supports drag-threshold magic-wand drawing deterministically", () => {
    LabelStudio.params().config(magicWandConfig).data(magicWandData).withResult([]).init();
    LabelStudio.waitForImageReady();

    selectMagicWandTool();
    Labels.select("Cloud");
    ImageView.drawRectRelative(0.35, 0.15, 0.22, 0.28);
    Sidebar.hasRegions(1);

    LabelStudio.serialize().then((result) => {
      const regionPayload = result.find((entry) => Array.isArray(entry.value.rle));

      expect(regionPayload).to.exist;
      expect(regionPayload?.value.rle.length ?? 0).to.be.greaterThan(0);
    });
  });

  it("supports mostly-vertical drag-threshold adjustments deterministically", () => {
    LabelStudio.params().config(magicWandConfig).data(magicWandData).withResult([]).init();
    LabelStudio.waitForImageReady();

    selectMagicWandTool();
    Labels.select("Cloud");

    // Keep horizontal delta small and vertical delta large to exercise an alternate threshold path.
    ImageView.drawRectRelative(0.42, 0.18, 0.02, 0.32);
    Sidebar.hasRegions(1);

    LabelStudio.serialize().then((result) => {
      const regionPayload = result.find((entry) => Array.isArray(entry.value.rle));

      expect(regionPayload).to.exist;
      expect(regionPayload?.value.rle.length ?? 0).to.be.greaterThan(0);
    });
  });

  it("creates stable magic-wand results after zooming out", () => {
    LabelStudio.params().config(magicWandConfig).data(magicWandData).withResult([]).init();
    LabelStudio.waitForImageReady();

    cy.get('button[aria-label="zoom-out"]').click().click().click();
    selectMagicWandTool();
    Labels.select("Cloud");
    ImageView.clickAtRelative(0.35, 0.15);
    Sidebar.hasRegions(1);
  });

  it("covers drawMask utility edge paths deterministically", () => {
    const width = 6;
    const height = 6;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        data[i] = x * 20;
        data[i + 1] = y * 20;
        data[i + 2] = 120;
        data[i + 3] = 255;
      }
    }

    const imageData = { data } as ImageData;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    expect(ctx).to.exist;
    if (!ctx) throw new Error("Canvas context is required for drawMask utility test");

    const mask = drawMask(imageData, ctx, width, height, 2, 2, 35, "#00ff00", 1, 2, false);
    expect(mask).to.exist;
    if (!mask) throw new Error("Expected drawMask to produce a mask");

    expect(mask.bounds.minX).to.be.at.least(0);
    expect(mask.bounds.minY).to.be.at.least(0);
    expect(mask.bounds.maxX).to.be.at.most(width - 1);
    expect(mask.bounds.maxY).to.be.at.most(height - 1);

    const broadMask = drawMask(imageData, ctx, width, height, 0, 0, 255, "#00ff00", 1, 4, false);
    expect(broadMask).to.exist;
    if (!broadMask) throw new Error("Expected broad drawMask to produce a mask");

    expect(Array.from(broadMask.data).some((value) => value === 1)).to.equal(true);
  });
});
